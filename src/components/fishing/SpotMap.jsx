import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's broken default icon path in bundled environments
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Coastal-themed teal marker for the selected/drop pin
const selectedIcon = new L.Icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  className:   'leaflet-marker-selected', // styled via inline <style>
})

// Center on Bolivar Peninsula — 604 Nelson Ave area
const DEFAULT_CENTER = [29.453, -94.534]
const DEFAULT_ZOOM   = 13

// Internal: handles click-to-drop-pin in pick mode
function PickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

// SpotMap —————————————————————————————————————————————————————————————————————
// mode='view' : shows spots as markers with popup detail (name, catches count)
// mode='pick' : click to drop a pin; calls onPick({ lat, lng })
export default function SpotMap({
  mode = 'view',
  spots = [],
  pickedPin = null,       // { lat, lng } — controlled from parent in pick mode
  onPick = null,          // (latLng) => void
  onSpotClick = null,     // (spot) => void  — called when a spot marker is clicked
  height = 320,
}) {
  return (
    <>
      <style>{`
        /* Teal tint for the selected pin */
        .leaflet-marker-selected { filter: hue-rotate(140deg) saturate(1.5); }
      `}</style>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height, width: '100%', borderRadius: '12px', zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode === 'pick' && onPick && <PickHandler onPick={onPick} />}

        {/* Drop pin in pick mode */}
        {mode === 'pick' && pickedPin && (
          <Marker
            position={[pickedPin.lat, pickedPin.lng]}
            icon={selectedIcon}
          >
            <Popup>Drop point</Popup>
          </Marker>
        )}

        {/* Existing spots in view mode */}
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
      </MapContainer>
    </>
  )
}
