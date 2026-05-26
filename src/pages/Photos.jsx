import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import Lightbox from '../components/Lightbox'

const PAGE_SIZE = 50

async function fetchPage(offset = 0) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  if (error) throw error
  return data ?? []
}

// ── Default export: Photos page ──────────────────────────────────

export default function Photos() {
  const [photos, setPhotos]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [showUpload, setShowUpload]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchPage(0)
      setPhotos(data)
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleLoadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const data = await fetchPage(photos.length)
      setPhotos(p => [...p, ...data])
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleUploadComplete() {
    setShowUpload(false)
    try {
      const data = await fetchPage(0)
      setPhotos(data)
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      // silently fail — grid shows stale photos until next open
    }
  }

  function handleDeleted(id) {
    setPhotos(p => p.filter(x => x.id !== id))
  }

  return (
    <>
      <style>{`
        .pbh-photos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        @media (min-width: 640px) {
          .pbh-photos-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .pbh-skel-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        @media (min-width: 640px) {
          .pbh-skel-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @keyframes pbh-pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.4 }
        }
      `}</style>

      <div style={{
        paddingTop: 'calc(var(--safe-top, 0px) + 16px)',
        paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px 16px',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '22px',
            fontWeight: 700, color: 'var(--color-navy)', margin: 0,
          }}>
            Family Photos
          </h1>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--color-teal)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)',
              padding: '9px 16px',
              fontSize: '14px', fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Add Photos
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="pbh-skel-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  background: 'var(--color-sand-100)',
                  animation: 'pbh-pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{
              color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '12px',
            }}>
              Couldn't load photos
            </p>
            <button
              onClick={load}
              style={{
                fontSize: '13px', color: 'var(--color-teal)', fontWeight: 600,
                border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-full)',
                background: 'transparent', padding: '7px 16px',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Retry
            </button>
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '72px 24px 48px', textAlign: 'center', gap: '12px',
          }}>
            <div style={{ fontSize: '52px', lineHeight: 1 }}>📷</div>
            <p style={{
              fontSize: '18px', fontWeight: 700,
              color: 'var(--color-navy)',
              fontFamily: 'var(--font-display)', margin: 0,
            }}>
              No photos yet
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
              Be the first to add one!
            </p>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                marginTop: '8px',
                background: 'var(--color-teal)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-full)',
                padding: '10px 24px',
                fontSize: '14px', fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Add Photos
            </button>
          </div>
        ) : (
          <>
            <div className="pbh-photos-grid">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIdx(i)}
                  style={{ aspectRatio: '1', cursor: 'zoom-in', overflow: 'hidden' }}
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
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', padding: '24px 16px 8px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    fontSize: '14px', fontWeight: 600,
                    color: 'var(--color-teal)',
                    border: '1px solid var(--color-teal)',
                    borderRadius: 'var(--radius-full)',
                    background: 'transparent',
                    padding: '9px 22px',
                    cursor: loadingMore ? 'default' : 'pointer',
                    opacity: loadingMore ? 0.6 : 1,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load more photos'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload sheet */}
      {showUpload && (
        <div
          onClick={() => setShowUpload(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 300,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: '540px',
              maxHeight: '92vh',
              overflowY: 'auto',
              paddingBottom: 'calc(var(--safe-bottom, 0px) + 16px)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--color-border)',
              position: 'sticky', top: 0, background: 'white', zIndex: 1,
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: '18px',
                fontWeight: 700, color: 'var(--color-navy)', margin: 0,
              }}>
                Add Photos
              </h2>
              <button
                onClick={() => setShowUpload(false)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '24px', lineHeight: 1,
                  cursor: 'pointer', padding: '2px 6px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <PhotoUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onDelete={handleDeleted}
        />
      )}
    </>
  )
}

// ── Named export: PhotoFeedPreview (for dashboard) ───────────────

export function PhotoFeedPreview() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    supabase
      .from('photos')
      .select('id, public_url, caption')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data?.length) setPhotos(data)
      })
  }, [])

  if (!photos.length) return null

  return (
    <>
      <style>{`.pbh-feed-scroll::-webkit-scrollbar { display: none }`}</style>
      <div
        className="pbh-feed-scroll"
        style={{
          display: 'flex', gap: '8px',
          overflowX: 'auto', paddingBottom: '2px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {photos.map(photo => (
          <img
            key={photo.id}
            src={photo.public_url}
            alt={photo.caption || 'Photo'}
            onClick={() => navigate('/photos')}
            style={{
              width: '72px', height: '72px', flexShrink: 0,
              objectFit: 'cover', borderRadius: '8px',
              cursor: 'pointer',
              background: 'var(--color-sand-100)',
            }}
          />
        ))}
        <div
          onClick={() => navigate('/photos')}
          style={{
            width: '72px', height: '72px', flexShrink: 0,
            borderRadius: '8px',
            background: 'var(--color-navy)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', gap: '1px',
          }}
        >
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: 'white', lineHeight: 1,
            fontFamily: 'var(--font-body)',
          }}>
            View
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: 'white', lineHeight: 1,
            fontFamily: 'var(--font-body)',
          }}>
            all →
          </span>
        </div>
      </div>
    </>
  )
}
