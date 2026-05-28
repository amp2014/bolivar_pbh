import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase'

// Fix Leaflet default icon in bundled env (same fix as SpotMap)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_CENTER = [29.4583, -94.6369]
const DEFAULT_ZOOM   = 13

// Teal fish-dot for catches
const catchIcon = new L.DivIcon({
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#2ab8c4;border:2px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;line-height:1;
  ">🐟</div>`,
  iconSize:    [22, 22],
  iconAnchor:  [11, 11],
  popupAnchor: [0, -14],
  className:   '',
})

// Navy pin for spots
const spotIcon = new L.DivIcon({
  html: `<div style="
    width:22px;height:28px;
    background:#1a3a5c;border:2px solid white;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 1px 4px rgba(0,0,0,0.35);
  "></div>`,
  iconSize:    [22, 28],
  iconAnchor:  [11, 28],
  popupAnchor: [0, -30],
  className:   '',
})

function FitBounds({ catches, spots, mode }) {
  const map = useMap()
  useEffect(() => {
    const pts = []
    if (mode !== 'spots') catches.forEach(c => pts.push([c.lat, c.lng]))
    if (mode !== 'catches') spots.forEach(s => pts.push([s.lat, s.lng]))
    if (pts.length === 0) return
    if (pts.length === 1) { map.setView(pts[0], 14); return }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 })
  }, [catches, spots, mode, map])
  return null
}

function dateLabel(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CatchMap() {
  const navigate = useNavigate()
  const [catches, setCatches] = useState([])
  const [spots,   setSpots]   = useState([])
  const [loading, setLoading] = useState(true)
  const [mode,    setMode]    = useState('both')  // 'catches' | 'spots' | 'both'

  useEffect(() => {
    async function load() {
      const [catchRes, spotRes] = await Promise.all([
        supabase
          .from('fishing_catches')
          .select('id, species, caught_at, photo_url, lat, lng, hide_metadata')
          .not('lat', 'is', null)
          .not('lng', 'is', null)
          .neq('hide_metadata', true)
          .order('caught_at', { ascending: false }),
        supabase
          .from('fishing_spots')
          .select('id, name, spot_type, lat, lng')
          .not('lat', 'is', null)
          .not('lng', 'is', null),
      ])
      setCatches(catchRes.data ?? [])
      setSpots(spotRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const showCatches = mode === 'catches' || mode === 'both'
  const showSpots   = mode === 'spots'   || mode === 'both'

  const noCatches = !loading && catches.length === 0
  const noSpots   = !loading && spots.length === 0
  const noData    = noCatches && noSpots

  return (
    <>
      <style>{`
        .catch-map-toggle button { transition: background 0.15s, color 0.15s; }
      `}</style>

      <div style={{
        paddingTop:    'calc(var(--safe-top, 0px) + 20px)',
        paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
      }}>
        {/* Header */}
        <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/fishing')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '14px', fontFamily: 'var(--font-body)' }}
          >
            ← Back
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
            Catch Map
          </h1>
        </div>

        {/* Toggle */}
        <div className="catch-map-toggle" style={{ padding: '0 16px 14px', display: 'flex', gap: '8px' }}>
          {['catches', 'spots', 'both'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, height: '36px', borderRadius: '20px',
                border: mode === m ? 'none' : '1px solid var(--color-border)',
                background: mode === m ? 'var(--color-navy)' : 'transparent',
                color: mode === m ? 'white' : 'var(--color-text-muted)',
                fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 600,
                cursor: 'pointer', textTransform: 'capitalize',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {m === 'both' ? 'Both' : m === 'catches' ? 'Catches' : 'Spots'}
            </button>
          ))}
        </div>

        {/* Map */}
        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <div style={{
              height: 360, borderRadius: '16px',
              background: 'var(--color-sand-100)',
              animation: 'pbh-pulse 1.4s ease-in-out infinite',
            }} />
          ) : noData ? (
            <div style={{
              height: 200, borderRadius: '16px', border: '1px solid var(--color-border)',
              background: 'var(--color-sand-50, #fdfaf5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', textAlign: 'center', padding: '0 24px' }}>
                No geotagged catches yet — log one from the Fishing tab.
              </p>
            </div>
          ) : (
            <div style={{ height: 440, borderRadius: '16px', overflow: 'hidden' }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds
                  catches={showCatches ? catches : []}
                  spots={showSpots ? spots : []}
                  mode={mode}
                />

                {showCatches && catches.map(c => (
                  <Marker key={c.id} position={[c.lat, c.lng]} icon={catchIcon}>
                    <Popup>
                      <div style={{ fontFamily: 'sans-serif', minWidth: 140 }}>
                        {c.photo_url && (
                          <img
                            src={c.photo_url}
                            alt={c.species}
                            style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }}
                          />
                        )}
                        <strong style={{ fontSize: '13px', color: '#1a3a5c' }}>{c.species || 'Unknown species'}</strong>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: 2 }}>{dateLabel(c.caught_at)}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {showSpots && spots.map(s => (
                  <Marker key={s.id} position={[s.lat, s.lng]} icon={spotIcon}>
                    <Popup>
                      <div style={{ fontFamily: 'sans-serif', minWidth: 120 }}>
                        <strong style={{ fontSize: '13px', color: '#1a3a5c' }}>{s.name}</strong>
                        {s.spot_type && (
                          <div style={{ fontSize: '11px', color: '#888', marginTop: 2, textTransform: 'capitalize' }}>{s.spot_type}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>

        {/* Legend */}
        {!loading && !noData && (
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: '16px' }}>
            {showCatches && catches.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🐟</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  {catches.length} catch{catches.length !== 1 ? 'es' : ''}
                </span>
              </div>
            )}
            {showSpots && spots.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#1a3a5c' }} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  {spots.length} spot{spots.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note about hidden catches */}
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontStyle: 'italic', padding: '8px 16px 0', margin: 0 }}>
          Catches marked private are not shown.
        </p>
      </div>
    </>
  )
}
