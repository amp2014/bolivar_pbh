import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's broken default icon path in bundled environments
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const selectedIcon = new L.Icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  className:   'leaflet-marker-selected',
})

// 604 Nelson Ave, Crystal Beach TX — verified via Nominatim/OSM
const DEFAULT_CENTER = [29.4583, -94.6369]
const DEFAULT_ZOOM   = 15

function PickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

// Locate button rendered inside the MapContainer so useMap() works
function LocateButton() {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  const [denied,   setDenied]   = useState(false)

  function locate() {
    if (locating) return
    setLocating(true)
    setDenied(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.2 })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setDenied(true)
        setTimeout(() => setDenied(false), 2500)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '10px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={locate}
        title={denied ? 'Location denied' : 'Go to my location'}
        style={{
          width: 36, height: 36,
          borderRadius: '8px',
          border: '2px solid rgba(0,0,0,0.2)',
          background: denied ? '#fff3cd' : 'white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          cursor: locating ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
          transition: 'background 0.2s',
        }}
      >
        {locating ? (
          // Spinning ring
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ab8c4" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a10 10 0 0 1 10 10" style={{ opacity: 1 }}>
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>
        ) : denied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e85d4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="10" r="4"/>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <path d="M4 4l16 16" stroke="#e85d4a"/>
          </svg>
        ) : (
          // Crosshair / locate icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            <circle cx="12" cy="12" r="9" strokeOpacity="0.25"/>
          </svg>
        )}
      </button>
      {denied && (
        <div style={{
          position: 'absolute', bottom: '42px', right: 0,
          background: 'white', borderRadius: '8px', padding: '6px 10px',
          fontSize: '11px', fontFamily: 'sans-serif', color: '#e85d4a',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}>
          Location denied
        </div>
      )}
    </div>
  )
}

export default function SpotMap({
  mode = 'view',
  spots = [],
  pickedPin = null,
  onPick = null,
  onSpotClick = null,
  height = 320,
}) {
  return (
    <>
      <style>{`
        .leaflet-marker-selected { filter: hue-rotate(140deg) saturate(1.5); }
        /* Keep the locate button above Leaflet's own controls */
        .spot-map-wrap { position: relative; }
      `}</style>

      <div className="spot-map-wrap" style={{ height, borderRadius: '12px', overflow: 'hidden' }}>
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

          {mode === 'pick' && onPick && <PickHandler onPick={onPick} />}

          {mode === 'pick' && pickedPin && (
            <Marker position={[pickedPin.lat, pickedPin.lng]} icon={selectedIcon}>
              <Popup>Drop point</Popup>
            </Marker>
          )}

          {mode === 'view' && spots.map(spot => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              eventHandlers={{ click: () => onSpotClick?.(spot) }}
            >
              <Popup>
                <strong style={{ fontFamily: 'sans-serif', fontSize: '13px' }}>{spot.name}</strong>
                {spot.spot_type && (
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'capitalize', marginTop: '2px' }}>
                    {spot.spot_type}
                  </div>
                )}
                {spot.catch_count != null && (
                  <div style={{ fontSize: '11px', color: '#2ab8c4', marginTop: '4px' }}>
                    {spot.catch_count} {spot.catch_count === 1 ? 'catch' : 'catches'}
                  </div>
                )}
              </Popup>
            </Marker>
          ))}

          <LocateButton />
        </MapContainer>
      </div>
    </>
  )
}
