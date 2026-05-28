import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getTravelTimes, formatMins } from '../../lib/travelTime'

// Valid camera IDs discovered 2026-05-27: 170-183 return real JPEGs; 184+ return HTML error page.
// Galveston terminal cams: 177-180 · Bolivar terminal cams: 181-183
// Swap IDs here once you've visually confirmed which views belong to each terminal.
const GALVESTON_CAMERAS = [177, 178, 179, 180]
const BOLIVAR_CAMERAS   = [181, 182, 183]

const WAIT_URL       = 'https://traffic.houstontranstar.org/ferrytimes/ferrywaittimes_travel.aspx'
const TRANSTAR_FERRY = 'https://www.houstontranstar.org/road_conditions/ferry_conditions.aspx'
const TWITTER_URL    = 'https://x.com/GalvestonFerry'
const ROTATE_MS      = 8000
const SKIP_MS        = 2000
const REFETCH_MS     = 10 * 60 * 1000

function camUrl(id, ts) {
  return `/api/ferry-camera?id=${id}&t=${ts}`
}

export default function FerryStatusCard() {
  const { profile } = useAuth()
  const homeAddress = profile?.home_address ?? null
  const [modal, setModal] = useState(null) // { cameras, index, ts }
  const [waitTimes, setWaitTimes] = useState(null)   // null = loading, {} = data
  const [waitStatus, setWaitStatus] = useState('loading') // loading | done | error

  const fetchWaitTimes = useCallback(() => {
    fetch('/api/ferry-times')
      .then((r) => r.json())
      .then((data) => { setWaitTimes(data); setWaitStatus('done') })
      .catch(() => setWaitStatus('error'))
  }, [])

  useEffect(() => {
    fetchWaitTimes()
    const id = setInterval(fetchWaitTimes, REFETCH_MS)
    return () => clearInterval(id)
  }, [fetchWaitTimes])

  return (
    <>
      <style>{`
        .pbh-cameras-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 480px) {
          .pbh-cameras-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ── Live Wait Times ────────────────────────────── */}
      <WaitTimesCard status={waitStatus} data={waitTimes} />

      {/* ── Live Cameras ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>📹</span>
          <p style={sectionLabel}>Live Cameras</p>
        </div>

        <div className="pbh-cameras-grid">
          <CameraViewer
            label="Galveston Queue"
            cameras={GALVESTON_CAMERAS}
            onOpenModal={(cameras, index, ts) => setModal({ cameras, index, ts })}
          />
          <CameraViewer
            label="Bolivar Queue"
            cameras={BOLIVAR_CAMERAS}
            onOpenModal={(cameras, index, ts) => setModal({ cameras, index, ts })}
          />
        </div>
      </div>

      {/* ── X card + Phone ────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <XCard />
        <PhoneCard />
      </div>

      {/* ── Drive Times & Quick Info ────────────────────── */}
      <div className="card">
        <div style={{ paddingTop: '2px' }}>
          <p style={{ ...sectionLabel, marginBottom: '10px' }}>Drive Times &amp; Quick Info</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TravelTimes homeAddress={homeAddress} />
            <InfoRow icon="⏱️" label="Typical Crossing" value="~18 min ride + ~9 min loading" />
          </div>
        </div>
      </div>

      {/* ── Fullscreen modal ──────────────────────────── */}
      {modal && (
        <CameraModal
          cameras={modal.cameras}
          initialIndex={modal.index}
          initialTs={modal.ts}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

// ── WaitTimesCard ─────────────────────────────────────────────

function WaitTimesCard({ status, data }) {
  const [tooltip, setTooltip] = useState(false)

  return (
    <div className="card" style={{ marginBottom: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>⛴️</span>
          <p style={sectionLabel}>Est. Travel Times</p>
          {status === 'done' && data && !data.error &&
            (data.seawall_to_bolivar?.available || data.bolivar_to_galveston?.available) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#22c55e', display: 'inline-block',
                boxShadow: '0 0 0 2px rgba(34,197,94,0.25)',
              }} />
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#22c55e', fontWeight: 600 }}>
                Live
              </span>
            </span>
          )}
        </div>
        {/* Info icon with tooltip */}
        <div style={{ position: 'relative' }}>
          <button
            onMouseEnter={() => setTooltip(true)}
            onMouseLeave={() => setTooltip(false)}
            onFocus={() => setTooltip(true)}
            onBlur={() => setTooltip(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '13px',
              width: '22px', height: '22px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
            }}
            aria-label="What does est. total time mean?"
          >
            ⓘ
          </button>
          {tooltip && (
            <div style={{
              position: 'absolute', right: 0, top: '26px',
              background: 'var(--color-navy)', color: 'white',
              fontSize: '11px', lineHeight: 1.4,
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              width: '180px',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}>
              Includes ~18 min crossing time plus queue wait
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {status === 'loading' && <WaitTimesSkeleton />}

      {status === 'error' && <WaitTimesUnavailable />}

      {status === 'done' && data && (
        data.error || (!data.seawall_to_bolivar?.available && !data.bolivar_to_galveston?.available)
          ? <WaitTimesUnavailable />
          : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1px 1fr',
              gap: '0',
              alignItems: 'start',
            }}>
              <WaitTimeColumn
                dir="Galveston → Bolivar"
                entry={data.seawall_to_bolivar}
              />
              <div style={{ width: '1px', background: 'var(--color-border)', alignSelf: 'stretch', margin: '0 4px' }} />
              <WaitTimeColumn
                dir="Bolivar → Galveston"
                entry={data.bolivar_to_galveston}
              />
            </div>
          )
      )}
    </div>
  )
}

function WaitTimeColumn({ dir, entry }) {
  if (!entry?.available) {
    return (
      <div style={{ padding: '0 8px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
          {dir}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>—</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 8px', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
        {dir}
      </p>
      <p style={{
        fontSize: '28px', fontWeight: 700,
        color: 'var(--color-navy)',
        lineHeight: 1, marginBottom: '4px',
        fontFamily: 'var(--font-body)',
        letterSpacing: '-0.5px',
      }}>
        {entry.travel_time}
      </p>
      {entry.reporting_time && (
        <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          reported {entry.reporting_time}
        </p>
      )}
    </div>
  )
}

function WaitTimesUnavailable() {
  return (
    <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
        Live wait times unavailable
      </p>
      <a
        href={WAIT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: '12px', color: 'var(--color-teal)', fontWeight: 600 }}
      >
        Check TranStar directly →
      </a>
    </div>
  )
}

function WaitTimesSkeleton() {
  const col = (
    <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ ...skeletonBase, width: '80%', height: '12px', borderRadius: '4px' }} />
      <div style={{ ...skeletonBase, width: '60%', height: '28px', borderRadius: '6px' }} />
      <div style={{ ...skeletonBase, width: '70%', height: '10px', borderRadius: '4px' }} />
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', alignItems: 'start' }}>
      {col}
      <div style={{ width: '1px', background: 'var(--color-border)', alignSelf: 'stretch', margin: '0 4px' }} />
      {col}
    </div>
  )
}

// ── XCard + PhoneCard ─────────────────────────────────────────

function XCard() {
  return (
    <a
      href={TWITTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="x-card-link"
      style={{
        flex: '1 1 190px',
        background: '#1A2332',
        borderRadius: 'var(--radius-sm)',
        padding: '14px 16px',
        textDecoration: 'none',
        display: 'flex', flexDirection: 'column', gap: '6px',
        cursor: 'pointer',
      }}
    >
      {/* Top row: X logo + account + CTA */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '15px', fontWeight: 800, color: 'white',
            lineHeight: 1, fontFamily: 'var(--font-body)',
            letterSpacing: '-0.5px',
          }}>
            𝕏
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'white', lineHeight: 1 }}>
            @GalvestonFerry
          </span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700,
          color: 'var(--color-teal)',
          background: 'rgba(42,184,196,0.15)',
          borderRadius: '4px',
          padding: '3px 7px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          Open on X →
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.4,
        margin: 0,
      }}>
        Hourly updates · Most reliable real-time source
      </p>
    </a>
  )
}

function PhoneCard() {
  return (
    <a
      href="tel:4097952230"
      style={{
        flex: '1 1 150px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '14px 16px',
        textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>📞</span>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '2px' }}>
          (409) 795-2230
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Tap to call · Ferry info
        </p>
      </div>
    </a>
  )
}

// ── CameraViewer ──────────────────────────────────────────────

function CameraViewer({ label, cameras, onOpenModal }) {
  const [index, setIndex]     = useState(0)
  const [ts, setTs]           = useState(() => Date.now())
  const [fade, setFade]       = useState(true)
  const [hasError, setHasError] = useState(false)
  const skipTimerRef          = useRef(null)

  const total = cameras.length

  const goTo = useCallback((next, freshTs) => {
    setFade(false)
    setTimeout(() => {
      setIndex(next)
      setTs(freshTs ?? Date.now())
      setHasError(false)
      setFade(true)
    }, 150)
  }, [])

  const prev = () => {
    clearTimeout(skipTimerRef.current)
    goTo((index - 1 + total) % total)
  }

  const next = useCallback(() => {
    clearTimeout(skipTimerRef.current)
    goTo((index + 1) % total)
  }, [index, total, goTo])

  const refresh = () => {
    clearTimeout(skipTimerRef.current)
    goTo(index)
  }

  const onError = useCallback(() => {
    setHasError(true)
    skipTimerRef.current = setTimeout(() => next(), SKIP_MS)
  }, [next])

  // Auto-rotate
  useEffect(() => {
    const id = setInterval(() => next(), ROTATE_MS)
    return () => clearInterval(id)
  }, [next])

  // Cleanup skip timer on unmount
  useEffect(() => () => clearTimeout(skipTimerRef.current), [])

  const updatedStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const src = camUrl(cameras[index], ts)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        {label}
      </p>

      {/* Image */}
      <button
        onClick={() => !hasError && onOpenModal(cameras, index, ts)}
        aria-label={`View ${label} full size`}
        style={{
          border: 'none', background: '#000', padding: 0,
          width: '100%', cursor: hasError ? 'default' : 'zoom-in',
          borderRadius: 'var(--radius-sm)', overflow: 'hidden',
          aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {hasError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px' }}>
            <span style={{ fontSize: '20px', filter: 'grayscale(1)', opacity: 0.4 }}>📷</span>
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', textAlign: 'center' }}>Camera unavailable</p>
          </div>
        ) : (
          <img
            key={`${cameras[index]}-${ts}`}
            src={src}
            alt={label}
            onError={onError}
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.15s ease',
              display: 'block',
            }}
          />
        )}
      </button>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prev} style={navBtn} aria-label="Previous camera">‹</button>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          {index + 1} of {total}
        </span>
        <button onClick={next} style={navBtn} aria-label="Next camera">›</button>
        <button onClick={refresh} style={{ ...navBtn, marginLeft: '4px', fontSize: '12px' }} aria-label="Refresh camera">↺</button>
      </div>

      <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
        Updated {updatedStr}
      </p>
    </div>
  )
}

// ── CameraModal ───────────────────────────────────────────────

function CameraModal({ cameras, initialIndex, initialTs, onClose }) {
  const [index, setIndex]     = useState(initialIndex)
  const [ts, setTs]           = useState(initialTs)
  const [fade, setFade]       = useState(true)
  const [hasError, setHasError] = useState(false)

  const total = cameras.length

  const goTo = (next) => {
    setFade(false)
    setTimeout(() => {
      setIndex(next)
      setTs(Date.now())
      setHasError(false)
      setFade(true)
    }, 150)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 400,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        gap: '14px',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 'calc(var(--safe-top, 0px) + 20px)', right: '20px',
          background: 'rgba(255,255,255,0.2)', color: 'white',
          border: 'none', width: '36px', height: '36px',
          borderRadius: '50%', fontSize: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        ×
      </button>

      {/* Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '800px' }}
      >
        {hasError ? (
          <div style={{
            aspectRatio: '4/3', background: '#111',
            borderRadius: 'var(--radius-md)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '32px', filter: 'grayscale(1)', opacity: 0.4 }}>📷</span>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Camera unavailable</p>
          </div>
        ) : (
          <img
            key={`modal-${cameras[index]}-${ts}`}
            src={camUrl(cameras[index], ts)}
            alt={`Camera ${index + 1}`}
            onError={() => setHasError(true)}
            style={{
              width: '100%', aspectRatio: '4/3',
              objectFit: 'contain',
              background: '#000',
              borderRadius: 'var(--radius-md)',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.15s ease',
              display: 'block',
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
      >
        <button
          onClick={() => goTo((index - 1 + total) % total)}
          style={modalNavBtn}
          aria-label="Previous"
        >‹</button>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>
          {index + 1} of {total}
        </span>
        <button
          onClick={() => goTo((index + 1) % total)}
          style={modalNavBtn}
          aria-label="Next"
        >›</button>
        <button
          onClick={() => { setTs(Date.now()); setHasError(false) }}
          style={{ ...modalNavBtn, fontSize: '18px' }}
          aria-label="Refresh"
        >↺</button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '2px' }}>
          {label}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-navy)', fontWeight: 500 }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function TravelTimes({ homeAddress }) {
  const [times, setTimes]   = useState(null)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!homeAddress) { setStatus('idle'); setTimes(null); return }
    setStatus('loading')
    getTravelTimes(homeAddress)
      .then((t) => { setTimes(t); setStatus(t ? 'done' : 'error') })
      .catch(() => setStatus('error'))
  }, [homeAddress])

  if (!homeAddress) {
    return <InfoRow icon="🏠" label="Drive Times" value="Add your home address in your profile for personalized estimates" />
  }
  if (status === 'loading') {
    return <InfoRow icon="🏠" label="Drive Times" value="Calculating from your home…" />
  }
  if (status === 'error' || !times) {
    return (
      <>
        <InfoRow icon="⛴️" label="Ferry Way" value="Via Galveston · couldn't estimate" />
        <InfoRow icon="🛣️" label="Back Way" value="Via Winnie · I-10 W · couldn't estimate" />
      </>
    )
  }
  return (
    <>
      {times.ferryTotalMins != null && (
        <InfoRow icon="⛴️" label="Ferry Way (from home)" value={`~${formatMins(times.ferryTotalMins)} total · incl. ~27 min ferry`} />
      )}
      {times.backWayMins != null && (
        <InfoRow icon="🛣️" label="Back Way (from home)" value={`~${formatMins(times.backWayMins)} via Winnie · I-10`} />
      )}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────

const sectionLabel = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  fontWeight: 600,
}

const navBtn = {
  background: 'var(--color-sand-100)',
  color: 'var(--color-navy)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  width: '28px', height: '28px',
  fontSize: '16px', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}

const modalNavBtn = {
  background: 'rgba(255,255,255,0.15)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  width: '44px', height: '44px',
  fontSize: '24px', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}

const skeletonBase = {
  background: 'var(--color-sand-100)',
  animation: 'pulse 1.6s ease-in-out infinite',
}
