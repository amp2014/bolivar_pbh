import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getTravelTimes, formatMins } from '../../lib/travelTime'

const CAM_GALV    = 'http://www.houstontranstar.org/snapshots/cctv/180.jpg'
const CAM_BOLIV   = 'http://www.houstontranstar.org/snapshots/cctv/181.jpg'
const WAIT_URL    = 'https://traffic.houstontranstar.org/ferrytimes/ferrywaittimes_travel.html'
const TRANSTAR_FERRY = 'https://www.houstontranstar.org/road_conditions/ferry_conditions.aspx'
const TWITTER_URL = 'https://twitter.com/GalvestonFerry'

export default function FerryStatusCard() {
  const { profile }                 = useAuth()
  const homeAddress                 = profile?.home_address ?? null
  const [cacheKey, setCacheKey]     = useState(() => Date.now())
  const [mountTime]                 = useState(() => new Date())
  const [galvErr, setGalvErr]       = useState(false)
  const [bolivErr, setBolivErr]     = useState(false)
  const [modalSrc, setModalSrc]     = useState(null)
  const [tweetState, setTweetState] = useState('loading') // loading | ready | error
  const twitterRef                  = useRef(null)

  useEffect(() => {
    let cancelled = false

    const initTimeline = () => {
      if (cancelled || !twitterRef.current) return
      window.twttr.widgets
        .createTimeline(
          { sourceType: 'profile', screenName: 'GalvestonFerry' },
          twitterRef.current,
          { tweetLimit: 2, theme: 'light', chrome: 'noheader nofooter noborders', width: '100%' }
        )
        .then(() => { if (!cancelled) setTweetState('ready') })
        .catch(() => { if (!cancelled) setTweetState('error') })
    }

    // Standard Twitter async init pattern — queues until widget.js processes _e
    if (window.twttr?.widgets) {
      initTimeline()
    } else {
      window.twttr = window.twttr || { _e: [], ready: (f) => window.twttr._e.push(f) }
      window.twttr._e = window.twttr._e || []
      window.twttr._e.push(initTimeline)

      if (!document.getElementById('twitter-wjs')) {
        const s = document.createElement('script')
        s.id      = 'twitter-wjs'
        s.src     = 'https://platform.twitter.com/widgets.js'
        s.async   = true
        s.charset = 'utf-8'
        s.onerror = () => { if (!cancelled) setTweetState('error') }
        document.head.appendChild(s)
      }
    }

    return () => { cancelled = true }
  }, [])

  const refresh = useCallback(() => {
    setCacheKey(Date.now())
    setGalvErr(false)
    setBolivErr(false)
  }, [])

  const mountStr = mountTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* ── Live Cameras ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>📹</span>
            <p style={sectionLabel}>Live Cameras</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              loaded {mountStr}
            </span>
            <button onClick={refresh} style={refreshBtn}>Refresh</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <CameraView
            label="Galveston Queue"
            src={`${CAM_GALV}?t=${cacheKey}`}
            hasError={galvErr}
            onError={() => setGalvErr(true)}
            onTap={() => setModalSrc(`${CAM_GALV}?t=${cacheKey}`)}
          />
          <CameraView
            label="Bolivar Queue"
            src={`${CAM_BOLIV}?t=${cacheKey}`}
            hasError={bolivErr}
            onError={() => setBolivErr(true)}
            onTap={() => setModalSrc(`${CAM_BOLIV}?t=${cacheKey}`)}
          />
        </div>
      </div>

      {/* ── @GalvestonFerry Timeline ────────────────────── */}
      <div className="card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-navy)', lineHeight: 1 }}>𝕏</span>
            <p style={sectionLabel}>@GalvestonFerry Updates</p>
          </div>
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: 'var(--color-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
          >
            Open →
          </a>
        </div>

        {tweetState === 'loading' && <TwitterSkeleton />}

        {tweetState === 'error' && (
          <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Tweets unavailable
            </p>
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '13px', color: 'var(--color-teal)', fontWeight: 600 }}
            >
              Visit @GalvestonFerry on X →
            </a>
          </div>
        )}

        {/* Twitter widget renders into this div */}
        <div ref={twitterRef} />
      </div>

      {/* ── Wait Times + Static Fallback ────────────────── */}
      <div className="card">
        {/* Opportunistic wait time link */}
        <a
          href={WAIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--color-teal-xlight)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '14px',
          }}
        >
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '2px' }}>
              Check Current Wait Times →
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              via TranStar · not always populated
            </p>
          </div>
          <span style={{ fontSize: '22px' }}>🕒</span>
        </a>

        {/* Always-visible fallback */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <p style={{ ...sectionLabel, marginBottom: '10px' }}>Drive Times &amp; Quick Info</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TravelTimes homeAddress={homeAddress} />
            <InfoRow icon="📞" label="Ferry Phone" value="(409) 795-2230" />
            <InfoRow icon="⏱️" label="Typical Crossing" value="~18 min ride + ~9 min loading" />
          </div>
        </div>
      </div>

      {/* ── Full-size camera modal ─────────────────────── */}
      {modalSrc && (
        <div
          onClick={() => setModalSrc(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            zIndex: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <img
            src={modalSrc}
            alt="Ferry camera full size"
            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 'var(--radius-md)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setModalSrc(null)}
            style={{
              position: 'absolute', top: 'calc(var(--safe-top) + 20px)', right: '20px',
              background: 'rgba(255,255,255,0.2)',
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

// ── Sub-components ────────────────────────────────────────────

function CameraView({ label, src, hasError, onError, onTap }) {
  return (
    <div>
      <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '5px' }}>
        {label}
      </p>
      {hasError ? (
        <div style={{
          background: 'var(--color-sand-100)',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
          padding: '16px 8px',
          textAlign: 'center',
          minHeight: '72px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Camera unavailable
          </p>
          <a
            href={TRANSTAR_FERRY}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '10px', color: 'var(--color-teal)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
          >
            Check TranStar →
          </a>
        </div>
      ) : (
        <button
          onClick={onTap}
          aria-label={`View ${label} full size`}
          style={{ border: 'none', background: 'none', padding: 0, width: '100%', cursor: 'zoom-in', display: 'block' }}
        >
          <img
            src={src}
            alt={label}
            onError={onError}
            style={{
              width: '100%',
              aspectRatio: '4/3',
              objectFit: 'cover',
              borderRadius: 'var(--radius-sm)',
              display: 'block',
              background: 'var(--color-sand-100)',
            }}
          />
        </button>
      )}
    </div>
  )
}

function TwitterSkeleton() {
  return (
    <div style={{ paddingBottom: '4px' }}>
      {[
        { w: '85%', mb: '6px' },
        { w: '62%', mb: '14px' },
        { w: '90%', mb: '6px' },
        { w: '55%', mb: '0' },
      ].map(({ w, mb }, i) => (
        <div key={i} style={{
          height: '11px',
          background: 'var(--color-sand-100)',
          borderRadius: 'var(--radius-full)',
          width: w,
          marginBottom: mb,
        }} />
      ))}
    </div>
  )
}

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
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  useEffect(() => {
    if (!homeAddress) { setStatus('idle'); setTimes(null); return }
    setStatus('loading')
    getTravelTimes(homeAddress)
      .then((t) => { setTimes(t); setStatus(t ? 'done' : 'error') })
      .catch(() => setStatus('error'))
  }, [homeAddress])

  if (!homeAddress) {
    return (
      <InfoRow icon="🏠" label="Drive Times" value="Add your home address in your profile for personalized estimates" />
    )
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
        <InfoRow
          icon="⛴️"
          label="Ferry Way (from home)"
          value={`~${formatMins(times.ferryTotalMins)} total · incl. ~27 min ferry`}
        />
      )}
      {times.backWayMins != null && (
        <InfoRow
          icon="🛣️"
          label="Back Way (from home)"
          value={`~${formatMins(times.backWayMins)} via Winnie · I-10`}
        />
      )}
    </>
  )
}

// ── Shared styles ─────────────────────────────────────────────

const sectionLabel = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  fontWeight: 600,
}

const refreshBtn = {
  background: 'var(--color-teal-xlight)',
  color: 'var(--color-teal)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
}
