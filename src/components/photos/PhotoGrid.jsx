import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { deletePhoto } from '../../lib/photos'

export default function PhotoGrid({ photos, onDeleted }) {
  const { profile, isAdmin, session } = useAuth()
  const [lightbox, setLightbox] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleDelete(photo, e) {
    e.stopPropagation()
    if (!window.confirm('Delete this photo?')) return
    setDeleting(photo.id)
    try {
      await deletePhoto(photo.id, photo.r2_key, session?.access_token)
      onDeleted?.(photo.id)
    } catch {
      // silently fail — user can try again
    }
    setDeleting(null)
  }

  if (!photos.length) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>📷</div>
        <p style={{ fontSize: '14px' }}>No photos yet — be the first to add one!</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
        {photos.map(photo => {
          const canDelete = isAdmin || profile?.id === photo.uploader_id
          return (
            <div
              key={photo.id}
              style={{ position: 'relative', aspectRatio: '1', cursor: 'zoom-in' }}
              onClick={() => setLightbox(photo)}
            >
              <img
                src={photo.public_url}
                alt={photo.caption || photo.filename || 'Photo'}
                loading="lazy"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                  background: 'var(--color-sand-100)',
                }}
              />
              {canDelete && (
                <button
                  onClick={(e) => handleDelete(photo, e)}
                  disabled={deleting === photo.id}
                  aria-label="Delete photo"
                  style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '22px', height: '22px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)',
                    color: 'white', border: 'none',
                    fontSize: '15px', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 400,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <img
            src={lightbox.public_url}
            alt={lightbox.caption || ''}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '75vh',
              borderRadius: '8px', objectFit: 'contain',
            }}
          />
          {lightbox.caption && (
            <p style={{ color: 'white', marginTop: '12px', fontSize: '14px', textAlign: 'center', maxWidth: '340px' }}>
              {lightbox.caption}
            </p>
          )}
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            {lightbox.uploader_name} · {new Date(lightbox.created_at).toLocaleDateString()}
          </p>
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute',
              top: 'calc(var(--safe-top) + 20px)',
              right: '20px',
              background: 'rgba(255,255,255,0.15)',
              color: 'white', border: 'none',
              width: '36px', height: '36px',
              borderRadius: '50%',
              fontSize: '20px', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
