import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLayout } from '../contexts/LayoutContext'
import PhotoUpload from '../components/PhotoUpload'
import Lightbox from '../components/Lightbox'

const PAGE_SIZE = 50

async function fetchPage(offset = 0, { from = '', to = '', uploaderId = '' } = {}) {
  let q = supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  if (from)       q = q.gte('created_at', from + 'T00:00:00')
  if (to)         q = q.lte('created_at', to + 'T23:59:59')
  if (uploaderId) q = q.eq('uploader_id', uploaderId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// ── Fishing Gallery ───────────────────────────────────────────────────────────
function FishingGallery() {
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState(null)

  useEffect(() => {
    supabase
      .from('fishing_catches')
      .select('id, photo_url, species, caption, caught_at, hide_metadata, tide_state, tide_height_ft, water_temp_f')
      .eq('shared_to_feed', true)
      .order('caught_at', { ascending: false })
      .then(({ data }) => {
        setCatches(data ?? [])
        setLoading(false)
      })
  }, [])

  // Convert catches to photo-like objects for the lightbox
  const lightboxPhotos = catches
    .filter(c => c.photo_url)
    .map(c => ({
      id:         c.id,
      public_url: c.photo_url,
      caption:    c.caption || c.species || 'Catch',
      uploader_name: null,
      created_at: c.caught_at,
    }))

  if (loading) {
    return (
      <div className="pbh-skel-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{
            aspectRatio: '1',
            background: 'var(--color-sand-100)',
            animation: 'pbh-pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.08}s`,
          }} />
        ))}
      </div>
    )
  }

  if (catches.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 48px', textAlign: 'center', gap: '12px' }}>
        <div style={{ fontSize: '52px', lineHeight: 1 }}>🎣</div>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', fontFamily: 'var(--font-display)', margin: 0 }}>
          No fishing photos shared
        </p>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
          Log a catch and turn on "Share to family feed" to see it here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="pbh-photos-grid">
        {catches.filter(c => c.photo_url).map((c, i) => (
          <div
            key={c.id}
            className="pbh-photo-cell"
            onClick={() => setLightboxIdx(i)}
            style={{ aspectRatio: '1', cursor: 'zoom-in', overflow: 'hidden' }}
          >
            <img
              src={c.photo_url}
              alt={c.species || 'Catch'}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: 'var(--color-sand-100)' }}
            />
            <div className="pbh-photo-overlay">
              {c.species && (
                <p style={{ color: 'white', fontSize: '10px', fontWeight: 600, lineHeight: 1.3, margin: 0, fontFamily: 'var(--font-body)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {c.species}
                </p>
              )}
              {!c.hide_metadata && c.tide_state && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', lineHeight: 1.3, margin: 0, fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {c.tide_state.charAt(0).toUpperCase() + c.tide_state.slice(1)} tide
                  {c.tide_height_ft != null ? ` · ${c.tide_height_ft}ft` : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightboxIdx !== null && lightboxPhotos.length > 0 && (
        <Lightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onDelete={null}
        />
      )}
    </>
  )
}

// ── Family Gallery ────────────────────────────────────────────────────────────
function FamilyGallery() {
  const { isDesktop } = useLayout()
  const [photos, setPhotos]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [hasMore, setHasMore]             = useState(false)
  const [lightboxIdx, setLightboxIdx]     = useState(null)
  const [showUpload, setShowUpload]       = useState(false)
  const [filterOpen, setFilterOpen]       = useState(false)
  const [filterFrom, setFilterFrom]       = useState('')
  const [filterTo, setFilterTo]           = useState('')
  const [filterUploader, setFilterUploader] = useState('')
  const [uploaderOptions, setUploaderOptions] = useState([])

  const hasFilter = !!filterFrom || !!filterTo || !!filterUploader

  useEffect(() => {
    supabase
      .from('photos')
      .select('uploader_id, uploader_name')
      .not('uploader_id', 'is', null)
      .then(({ data }) => {
        if (!data) return
        const seen = new Set()
        const opts = []
        for (const row of data) {
          if (!seen.has(row.uploader_id)) {
            seen.add(row.uploader_id)
            opts.push({ id: row.uploader_id, name: row.uploader_name || 'Unknown' })
          }
        }
        setUploaderOptions(opts.sort((a, b) => a.name.localeCompare(b.name)))
      })
  }, [])

  const filters = { from: filterFrom, to: filterTo, uploaderId: filterUploader }

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchPage(0, { from: filterFrom, to: filterTo, uploaderId: filterUploader })
      setPhotos(data)
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [filterFrom, filterTo, filterUploader])

  useEffect(() => { load() }, [load])

  async function handleLoadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const data = await fetchPage(photos.length, filters)
      setPhotos(p => [...p, ...data])
      setHasMore(data.length === PAGE_SIZE)
    } catch { /* silently fail */ }
    finally { setLoadingMore(false) }
  }

  async function handleUploadComplete() {
    setShowUpload(false)
    try {
      const data = await fetchPage(0, filters)
      setPhotos(data)
      setHasMore(data.length === PAGE_SIZE)
    } catch { /* silently fail */ }
  }

  function handleDeleted(id) { setPhotos(p => p.filter(x => x.id !== id)) }
  function clearFilter() { setFilterFrom(''); setFilterTo(''); setFilterUploader('') }

  return (
    <>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setFilterOpen(f => !f)}
            aria-label="Filter photos"
            style={{
              position: 'relative',
              background: filterOpen || hasFilter ? 'var(--color-teal)' : 'var(--color-sand-100)',
              border: 'none', borderRadius: 'var(--radius-full)',
              width: '38px', height: '38px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: filterOpen || hasFilter ? 'white' : 'var(--color-text-muted)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            {hasFilter && !filterOpen && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-coral)', border: '1.5px solid white' }} />
            )}
          </button>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--color-teal)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)',
              padding: '9px 16px', fontSize: '14px', fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
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
      </div>

      {/* ── Filter bar ── */}
      {filterOpen && (
        <div style={{ padding: '0 16px 14px', borderBottom: '1px solid var(--color-border)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.5px', flexShrink: 0 }}>FROM</span>
              <input type="date" value={filterFrom} max={filterTo || undefined} onChange={e => setFilterFrom(e.target.value)} className="pbh-date-input" />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.5px', flexShrink: 0 }}>TO</span>
              <input type="date" value={filterTo} min={filterFrom || undefined} onChange={e => setFilterTo(e.target.value)} className="pbh-date-input" />
            </div>
          </div>
          {uploaderOptions.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {uploaderOptions.map(opt => (
                <button key={opt.id} onClick={() => setFilterUploader(v => v === opt.id ? '' : opt.id)}
                  style={{
                    fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: filterUploader === opt.id ? 'none' : '1px solid var(--color-border)',
                    background: filterUploader === opt.id ? 'var(--color-navy)' : 'white',
                    color: filterUploader === opt.id ? 'white' : 'var(--color-text)',
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}>{opt.name}</button>
              ))}
            </div>
          )}
          {hasFilter && (
            <button onClick={clearFilter} style={{ alignSelf: 'flex-start', fontSize: '12px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent' }}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {hasFilter && !filterOpen && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(filterFrom || filterTo) && (
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', background: '#e8f4f8', borderRadius: '6px', padding: '3px 8px' }}>
              {filterFrom && filterTo ? `${filterFrom} → ${filterTo}` : filterFrom ? `From ${filterFrom}` : `Until ${filterTo}`}
            </span>
          )}
          {filterUploader && uploaderOptions.find(o => o.id === filterUploader) && (
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', background: '#e8f4f8', borderRadius: '6px', padding: '3px 8px' }}>
              {uploaderOptions.find(o => o.id === filterUploader)?.name}
            </span>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="pbh-skel-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1', background: 'var(--color-sand-100)', animation: 'pbh-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '12px' }}>Couldn't load photos</p>
          <button onClick={load} style={{ fontSize: '13px', color: 'var(--color-teal)', fontWeight: 600, border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-full)', background: 'transparent', padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Retry</button>
        </div>
      ) : photos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 48px', textAlign: 'center', gap: '12px' }}>
          <div style={{ fontSize: '52px', lineHeight: 1 }}>{hasFilter ? '🔍' : '📷'}</div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', fontFamily: 'var(--font-display)', margin: 0 }}>
            {hasFilter ? 'No photos match' : 'No photos yet'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
            {hasFilter ? 'Try adjusting the filters' : 'Be the first to add one!'}
          </p>
          {hasFilter ? (
            <button onClick={clearFilter} style={{ marginTop: '8px', background: 'transparent', color: 'var(--color-teal)', border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Clear filters</button>
          ) : (
            <button onClick={() => setShowUpload(true)} style={{ marginTop: '8px', background: 'var(--color-teal)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Add Photos</button>
          )}
        </div>
      ) : (
        <>
          <div className="pbh-photos-grid">
            {photos.map((photo, i) => (
              <div key={photo.id} className="pbh-photo-cell" onClick={() => setLightboxIdx(i)} style={{ aspectRatio: '1', cursor: 'zoom-in', overflow: 'hidden' }}>
                <img src={photo.public_url} alt={photo.caption || photo.filename || 'Photo'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: 'var(--color-sand-100)' }} />
                <div className="pbh-photo-overlay">
                  {photo.uploader_name && (
                    <p style={{ color: 'white', fontSize: '10px', fontWeight: 600, lineHeight: 1.3, margin: 0, fontFamily: 'var(--font-body)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{photo.uploader_name}</p>
                  )}
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', lineHeight: 1.3, margin: 0, fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {new Date(photo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '24px 16px 8px' }}>
              <button onClick={handleLoadMore} disabled={loadingMore} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-teal)', border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-full)', background: 'transparent', padding: '9px 22px', cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.6 : 1, fontFamily: 'var(--font-body)' }}>
                {loadingMore ? 'Loading…' : 'Load more photos'}
              </button>
            </div>
          )}
        </>
      )}

      {showUpload && (
        <div onClick={() => setShowUpload(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: isDesktop ? '16px' : '20px 20px 0 0', width: '100%', maxWidth: '600px', maxHeight: '92vh', overflowY: 'auto', paddingBottom: isDesktop ? '0' : 'calc(var(--safe-bottom, 0px) + 16px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>Add Photos</h2>
              <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '24px', lineHeight: 1, cursor: 'pointer', padding: '2px 6px', WebkitTapHighlightColor: 'transparent' }}>×</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <PhotoUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      )}

      {lightboxIdx !== null && photos.length > 0 && (
        <Lightbox photos={photos} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} onDelete={handleDeleted} />
      )}
    </>
  )
}

// ── Photos page container with gallery switcher ───────────────────────────────
const GALLERIES = [
  { key: 'family',  label: 'Family' },
  { key: 'fishing', label: 'Fishing' },
]

export default function Photos() {
  const [galleryKey, setGallery] = useState('family')

  return (
    <>
      <style>{`
        .pbh-photos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        @media (min-width: 640px)  { .pbh-photos-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .pbh-photos-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1280px) { .pbh-photos-grid { grid-template-columns: repeat(6, 1fr); } }

        .pbh-skel-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        @media (min-width: 640px)  { .pbh-skel-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .pbh-skel-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1280px) { .pbh-skel-grid { grid-template-columns: repeat(6, 1fr); } }
        @keyframes pbh-pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
        .pbh-date-input {
          flex: 1; min-width: 0;
          border: 1px solid var(--color-border); border-radius: 8px;
          padding: 7px 8px; font-size: 13px; font-family: var(--font-body);
          color: var(--color-text); background: white; outline: none;
        }
        .pbh-date-input:focus { border-color: var(--color-teal); }
        .pbh-photo-cell { position: relative; }
        .pbh-photo-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.42);
          opacity: 0; transition: opacity 0.18s;
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: flex-end;
          padding: 6px 8px; pointer-events: none;
        }
        @media (hover: hover) {
          .pbh-photo-cell:hover .pbh-photo-overlay { opacity: 1; }
        }
      `}</style>

      <div style={{
        paddingTop: 'calc(var(--safe-top, 0px) + 16px)',
        paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
      }}>

        {/* ── Header + gallery switcher ── */}
        <div style={{ padding: '0 16px 12px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '22px',
            fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 12px',
          }}>
            Photos
          </h1>

          {/* Segmented control */}
          <div style={{
            display: 'inline-flex', gap: '4px',
            background: 'var(--color-sand-100)',
            borderRadius: 'var(--radius-full)',
            padding: '4px',
          }}>
            {GALLERIES.map(g => (
              <button
                key={g.key}
                onClick={() => setGallery(g.key)}
                style={{
                  height: '34px', padding: '0 18px',
                  borderRadius: 'var(--radius-full)', border: 'none',
                  background: galleryKey === g.key ? 'white' : 'transparent',
                  color: galleryKey === g.key ? 'var(--color-navy)' : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '14px',
                  fontWeight: galleryKey === g.key ? 600 : 400,
                  cursor: 'pointer',
                  boxShadow: galleryKey === g.key ? 'var(--shadow-card)' : 'none',
                  transition: 'all 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Gallery content ── */}
        {galleryKey === 'family'  && <FamilyGallery />}
        {galleryKey === 'fishing' && <FishingGallery />}

      </div>
    </>
  )
}

// ── Named export: PhotoFeedPreview (for dashboard) ───────────────────────────
export function PhotoFeedPreview() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    supabase
      .from('photos')
      .select('id, public_url, caption')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data?.length) setPhotos(data) })
  }, [])

  if (!photos.length) return null

  return (
    <>
      <style>{`.pbh-feed-scroll::-webkit-scrollbar { display: none }`}</style>
      <div className="pbh-feed-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {photos.map(photo => (
          <img key={photo.id} src={photo.public_url} alt={photo.caption || 'Photo'} onClick={() => navigate('/photos')}
            style={{ width: '72px', height: '72px', flexShrink: 0, objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', background: 'var(--color-sand-100)' }} />
        ))}
        <div onClick={() => navigate('/photos')} style={{ width: '72px', height: '72px', flexShrink: 0, borderRadius: '8px', background: 'var(--color-navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '1px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', lineHeight: 1, fontFamily: 'var(--font-body)' }}>View</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', lineHeight: 1, fontFamily: 'var(--font-body)' }}>all →</span>
        </div>
      </div>
    </>
  )
}
