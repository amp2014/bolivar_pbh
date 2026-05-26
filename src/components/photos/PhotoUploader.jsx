import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getUploadUrl, uploadToR2, savePhotoMetadata } from '../../lib/photos'

export default function PhotoUploader({ onUploaded }) {
  const { profile, session } = useAuth()
  const [queue, setQueue] = useState([])
  const inputRef = useRef(null)
  const processingRef = useRef(false)

  async function processQueue(items) {
    if (processingRef.current) return
    processingRef.current = true

    for (const item of items) {
      setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i))
      try {
        const { uploadUrl, r2Key, publicUrl } = await getUploadUrl({
          filename: item.file.name,
          contentType: item.file.type || 'image/jpeg',
          token: session?.access_token,
        })
        await uploadToR2(uploadUrl, item.file)
        await savePhotoMetadata({
          r2Key, publicUrl,
          filename: item.file.name,
          fileSize: item.file.size,
          contentType: item.file.type || 'image/jpeg',
          uploaderId: profile?.id,
          uploaderName: profile?.display_name,
        })
        setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'done' } : i))
        onUploaded?.()
      } catch {
        setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'error' } : i))
      }
    }

    processingRef.current = false
    setTimeout(() => setQueue([]), 2500)
  }

  function handleChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const items = files.map(file => ({ id: Math.random(), file, status: 'pending' }))
    setQueue(items)
    processQueue(items)
    e.target.value = ''
  }

  const uploading = queue.some(i => i.status === 'uploading' || i.status === 'pending')
  const doneCount = queue.filter(i => i.status === 'done').length
  const hasError = queue.some(i => i.status === 'error')

  let label = '+ Add Photo'
  if (uploading) label = `Uploading ${doneCount}/${queue.length}…`
  else if (queue.length > 0 && !hasError) label = '✓ Done!'
  else if (hasError) label = 'Some failed — retry?'

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          background: hasError ? 'var(--color-coral)' : 'var(--color-teal)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.75 : 1,
          WebkitTapHighlightColor: 'transparent',
          transition: 'background 0.2s',
        }}
      >
        {label}
      </button>
    </div>
  )
}
