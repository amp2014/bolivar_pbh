import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const MAX_BYTES = 25 * 1024 * 1024

// ── Helpers ───────────────────────────────────────────────────

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function truncate(name, max = 20) {
  if (name.length <= max) return name
  const dot = name.lastIndexOf('.')
  if (dot > 0 && name.length - dot <= 5) {
    return name.slice(0, max - (name.length - dot) - 1) + '…' + name.slice(dot)
  }
  return name.slice(0, max - 1) + '…'
}

function xhrPut(url, file, onProgress, abortRef) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    if (abortRef) abortRef.current = xhr
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(new Error('Aborted')))
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

// ── Main component ────────────────────────────────────────────

export default function PhotoUpload({ onUploadComplete, maxFiles = 10 }) {
  const { profile, session } = useAuth()

  const [files, setFiles]           = useState([])
  const [rejections, setRejections] = useState([])
  const [uploading, setUploading]   = useState(false)
  const [dragging, setDragging]     = useState(false)

  const inputRef   = useRef(null)
  const filesRef   = useRef([])
  const activeXhr  = useRef(null)
  filesRef.current = files

  useEffect(() => () => {
    filesRef.current.forEach(f => URL.revokeObjectURL(f.preview))
    activeXhr.current?.abort()
  }, [])

  // ── File management ────────────────────────────────────────

  function addFiles(incoming) {
    const bad = []
    const good = []
    const current = filesRef.current.length

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        bad.push({ filename: file.name, reason: 'Not an image' })
      } else if (file.size > MAX_BYTES) {
        bad.push({ filename: file.name, reason: 'Over 25 MB' })
      } else if (current + good.length >= maxFiles) {
        bad.push({ filename: file.name, reason: `Max ${maxFiles} files` })
      } else {
        good.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          caption: '',
          status: 'pending',   // pending | uploading | done | error
          progress: 0,
          error: null,
        })
      }
    }

    if (bad.length)  setRejections(r => [...r, ...bad])
    if (good.length) setFiles(f => [...f, ...good])
  }

  function removeFile(id) {
    setFiles(prev => {
      const item = prev.find(f => f.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  function updateCaption(id, val) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, caption: val } : f))
  }

  // ── Upload ────────────────────────────────────────────────

  async function startUpload(overrideIds = null) {
    const toUpload = overrideIds
      ? filesRef.current.filter(f => overrideIds.includes(f.id))
      : filesRef.current.filter(f => f.status === 'pending')

    if (!toUpload.length || uploading) return
    setUploading(true)
    let allSucceeded = true

    for (const item of toUpload) {
      setFiles(prev => prev.map(f =>
        f.id === item.id ? { ...f, status: 'uploading', progress: 0, error: null } : f
      ))

      try {
        // a. Presigned URL
        const urlRes = await fetch('/api/get-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            filename: item.file.name,
            contentType: item.file.type,
            uploaderId: profile?.id,
          }),
        })
        if (!urlRes.ok) throw new Error('Could not get upload URL')
        const { uploadUrl, r2Key, publicUrl } = await urlRes.json()

        // b. PUT to R2 with progress
        await xhrPut(uploadUrl, item.file, (pct) => {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f))
        }, activeXhr)

        // c. Save metadata to Supabase
        const caption = filesRef.current.find(f => f.id === item.id)?.caption?.trim() || null
        const { error: dbErr } = await supabase.from('photos').insert({
          r2_key:        r2Key,
          public_url:    publicUrl,
          filename:      item.file.name,
          file_size:     item.file.size,
          content_type:  item.file.type,
          caption,
          uploader_id:   profile?.id,
          uploader_name: profile?.display_name,
        })
        if (dbErr) throw dbErr

        // d. Mark done
        setFiles(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'done', progress: 100 } : f
        ))
      } catch (err) {
        if (err.message === 'Aborted') break
        allSucceeded = false
        setFiles(prev => prev.map(f =>
          f.id === item.id
            ? { ...f, status: 'error', error: err.message || 'Upload failed' }
            : f
        ))
      }
    }

    setUploading(false)

    if (allSucceeded) {
      // Check all files (not just this batch) are done before completing
      const allDone = filesRef.current.every(f => f.status === 'done')
      if (allDone) {
        setTimeout(() => {
          filesRef.current.forEach(f => URL.revokeObjectURL(f.preview))
          setFiles([])
          setRejections([])
          onUploadComplete?.()
        }, 1000)
      }
    }
  }

  // ── Drag & drop ───────────────────────────────────────────

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }
  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }
  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  // ── Derived state ─────────────────────────────────────────

  const pendingCount  = files.filter(f => f.status === 'pending').length
  const doneCount     = files.filter(f => f.status === 'done').length
  const canAddMore    = files.length < maxFiles && !uploading

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      {/* Drop zone */}
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          style={{
            background:    dragging ? '#dff5f7' : '#F5EDD8',
            border:        `2px dashed ${dragging ? '#1B6B8A' : '#4AABB5'}`,
            borderRadius:  'var(--radius-md)',
            padding:       '32px 16px',
            textAlign:     'center',
            cursor:        'pointer',
            transition:    'background 0.15s, border-color 0.15s',
            marginBottom:  files.length ? '16px' : 0,
            userSelect:    'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []))
              e.target.value = ''
            }}
          />
          <div style={{ fontSize: '30px', marginBottom: '8px', lineHeight: 1 }}>📷</div>
          <p style={{
            fontSize: '15px', fontWeight: 600,
            color: 'var(--color-navy)', marginBottom: '4px',
          }}>
            Tap to add photos
          </p>
          <p style={{
            fontSize: '11px', color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
          }}>
            JPEG · PNG · HEIC · max 25 MB · up to {maxFiles} files
          </p>
        </div>
      )}

      {/* Validation rejections */}
      {rejections.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rejections.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fdf3f0',
                border: '1px solid #D4634A',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 10px',
              }}
            >
              <p style={{
                fontSize: '11px', color: '#D4634A',
                fontFamily: 'var(--font-mono)', lineHeight: 1.4,
              }}>
                {truncate(r.filename, 24)} — {r.reason}
              </p>
              <button
                onClick={() => setRejections(prev => prev.filter((_, j) => j !== i))}
                style={{
                  background: 'none', border: 'none',
                  color: '#D4634A', cursor: 'pointer',
                  fontSize: '16px', padding: '0 0 0 10px', lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {files.map(item => (
            <FileCard
              key={item.id}
              item={item}
              onRemove={() => removeFile(item.id)}
              onCaptionChange={(val) => updateCaption(item.id, val)}
              onRetry={() => startUpload([item.id])}
            />
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <button
          onClick={() => startUpload()}
          disabled={uploading || pendingCount === 0}
          style={{
            width: '100%', height: '48px',
            background: uploading || pendingCount === 0 ? 'var(--color-sand-200)' : '#1B6B8A',
            color:      uploading || pendingCount === 0 ? 'var(--color-text-muted)' : 'white',
            border:     'none',
            borderRadius: 'var(--radius-full)',
            fontSize:   '15px', fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor:     uploading || pendingCount === 0 ? 'not-allowed' : 'pointer',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            gap:        '8px',
            transition: 'background 0.2s, color 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {uploading ? (
            <><Spinner /> Uploading…</>
          ) : doneCount > 0 && pendingCount === 0 ? (
            `✓ ${doneCount} uploaded`
          ) : (
            `Upload ${pendingCount} photo${pendingCount !== 1 ? 's' : ''}`
          )}
        </button>
      )}
    </div>
  )
}

// ── FileCard ──────────────────────────────────────────────────

function FileCard({ item, onRemove, onCaptionChange, onRetry }) {
  const { file, preview, caption, status, progress, error } = item

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {/* Thumbnail */}
      <div style={{
        position: 'relative', aspectRatio: '1',
        borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        background: 'var(--color-sand-100)',
      }}>
        <img
          src={preview}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Upload progress overlay */}
        {status === 'uploading' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '0 12px',
          }}>
            <div style={{
              width: '100%', height: '5px',
              background: '#E8F4F8', borderRadius: '3px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: '#1B6B8A',
                width: `${progress}%`, transition: 'width 0.15s',
                borderRadius: '3px',
              }} />
            </div>
            <span style={{
              fontSize: '10px', color: 'white',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
            }}>
              {progress}%
            </span>
          </div>
        )}

        {/* Success overlay */}
        {status === 'done' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(21,87,36,0.62)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '26px', color: 'white', fontWeight: 700 }}>✓</span>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(212,99,74,0.78)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '5px', padding: '6px',
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <button
              onClick={onRetry}
              style={{
                fontSize: '11px', fontWeight: 700,
                background: 'white', color: '#D4634A',
                border: 'none', borderRadius: '4px',
                padding: '3px 9px', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Remove button — only when pending */}
        {status === 'pending' && (
          <button
            onClick={onRemove}
            aria-label="Remove"
            style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              color: 'white', border: 'none',
              fontSize: '14px', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Filename + size */}
      <div style={{ lineHeight: 1.3 }}>
        <p style={{
          fontSize: '10px', fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {truncate(file.name)}
        </p>
        <p style={{
          fontSize: '10px', fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-muted)',
        }}>
          {formatSize(file.size)}
        </p>
      </div>

      {/* Caption input */}
      <input
        type="text"
        value={caption}
        maxLength={150}
        placeholder="Add a caption…"
        disabled={status === 'uploading' || status === 'done'}
        onChange={(e) => onCaptionChange(e.target.value)}
        style={{
          width: '100%', fontSize: '11px',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '5px 7px',
          background: status === 'done' ? 'var(--color-sand-100)' : 'white',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16"
      style={{ animation: 'pbh-spin 0.75s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes pbh-spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.2" />
      <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
