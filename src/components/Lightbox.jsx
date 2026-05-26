import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Lightbox({ photos, initialIndex, onClose, onDelete }) {
  const { profile, isAdmin, session } = useAuth()
  const [index, setIndex]               = useState(initialIndex)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const touchStartX                     = useRef(null)

  const photo = photos[Math.min(index, photos.length - 1)]

  const prev = useCallback(() => {
    setConfirmDelete(false)
    setIndex(i => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  const next = useCallback(() => {
    setConfirmDelete(false)
    setIndex(i => (i + 1) % photos.length)
  }, [photos.length])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft')  prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onClose])

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev()
    touchStartX.current = null
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ photoId: photo.id, r2Key: photo.r2_key }),
      })
      if (!res.ok) throw new Error('Delete failed')
      onDelete(photo.id, photo.r2_key)
      const remaining = photos.length - 1
      if (remaining === 0) {
        onClose()
      } else {
        setIndex(i => Math.min(i, remaining - 1))
        setConfirmDelete(false)
      }
    } catch {
      // silently fail — user can try again
    } finally {
      setDeleting(false)
    }
  }

  if (!photo) return null

  const canDelete = isAdmin || profile?.id === photo.uploader_id

  return (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,35,50,0.95)',
        zIndex: 500,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-top, 0px) + 16px)',
          right: '16px',
          background: 'rgba(255,255,255,0.12)',
          color: 'white', border: 'none',
          width: '40px', height: '40px', borderRadius: '50%',
          fontSize: '22px', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 1,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ×
      </button>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          style={{
            position: 'absolute', left: '12px',
            top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.12)',
            color: 'white', border: 'none',
            width: '44px', height: '44px', borderRadius: '50%',
            fontSize: '26px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ‹
        </button>
      )}

      {/* Photo */}
      <img
        src={photo.public_url}
        alt={photo.caption || photo.filename || 'Photo'}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '75vh',
          objectFit: 'contain',
          borderRadius: '6px',
          display: 'block',
          userSelect: 'none',
        }}
      />

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          style={{
            position: 'absolute', right: '12px',
            top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.12)',
            color: 'white', border: 'none',
            width: '44px', height: '44px', borderRadius: '50%',
            fontSize: '26px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ›
        </button>
      )}

      {/* Info bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 'calc(var(--safe-bottom, 0px) + 20px)',
          left: 0, right: 0,
          padding: '0 16px',
        }}
      >
        {confirmDelete ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', flexWrap: 'wrap',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '14px', padding: '12px 16px',
          }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              Delete this photo?
            </span>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                fontSize: '13px', color: 'white',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: '8px', padding: '7px 16px',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                fontSize: '13px', color: 'white', fontWeight: 600,
                background: '#D4634A', border: 'none',
                borderRadius: '8px', padding: '7px 16px',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1,
                fontFamily: 'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '10px',
          }}>
            {/* Left: uploader + date */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <p style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--font-mono)',
                margin: 0, letterSpacing: '0.2px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {photo.uploader_name} · {new Date(photo.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Center: caption */}
            <div style={{ flex: '2 1 0', minWidth: 0, textAlign: 'center' }}>
              {photo.caption && (
                <p style={{
                  fontSize: '14px', color: 'white',
                  margin: 0, lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {photo.caption}
                </p>
              )}
            </div>

            {/* Right: delete */}
            <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end' }}>
              {canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete photo"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none', color: 'rgba(255,255,255,0.65)',
                    width: '40px', height: '40px',
                    borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
