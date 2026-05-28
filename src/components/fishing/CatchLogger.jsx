import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getCurrentTideState, getWaterTemp } from '../../services/noaa'
import { getUploadUrl, uploadToR2 } from '../../lib/photos'

const LAT = 29.453
const LON = -94.534

const SPECIES = [
  'Speckled Trout', 'Redfish', 'Flounder', 'Black Drum',
  'Sheepshead', 'Croaker', 'Sand Trout', 'Gafftop', 'Hardhead', 'Other',
]

const SPOT_TYPES = ['surf', 'jetty', 'pier', 'wade', 'boat', 'other']

// ── Minimal EXIF GPS extractor ────────────────────────────────────────────────
async function extractExifGps(file) {
  try {
    const buf = await file.arrayBuffer()
    const view = new DataView(buf)
    if (view.getUint16(0) !== 0xFFD8) return null // not JPEG

    let offset = 2
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset)
      offset += 2
      if (marker === 0xFFE1) { // APP1 — EXIF
        const len    = view.getUint16(offset)
        const exifStart = offset + 2
        const header = String.fromCharCode(
          view.getUint8(exifStart), view.getUint8(exifStart + 1),
          view.getUint8(exifStart + 2), view.getUint8(exifStart + 3),
        )
        if (header !== 'Exif') break

        // TIFF header at exifStart + 6
        const tiffBase = exifStart + 6
        const isLE = view.getUint16(tiffBase) === 0x4949
        const read16 = o => isLE ? view.getUint16(tiffBase + o, true) : view.getUint16(tiffBase + o)
        const read32 = o => isLE ? view.getUint32(tiffBase + o, true) : view.getUint32(tiffBase + o)

        const ifd0Offset = read32(4)
        const ifd0Count  = read16(ifd0Offset)

        let gpsIfdOffset = null
        for (let i = 0; i < ifd0Count; i++) {
          const entryOffset = ifd0Offset + 2 + i * 12
          const tag = read16(entryOffset)
          if (tag === 0x8825) { // GPSInfoIFDPointer
            gpsIfdOffset = read32(entryOffset + 8)
            break
          }
        }
        if (!gpsIfdOffset) break

        const gpsCount = read16(gpsIfdOffset)
        const tags = {}
        for (let i = 0; i < gpsCount; i++) {
          const entryOffset = gpsIfdOffset + 2 + i * 12
          const tag  = read16(entryOffset)
          const type = read16(entryOffset + 2)
          const count = read32(entryOffset + 4)
          const valueOffset = entryOffset + 8

          if (tag === 0x0001 || tag === 0x0003) { // LatRef / LonRef
            tags[tag] = String.fromCharCode(view.getUint8(tiffBase + read32(valueOffset)))
          } else if (tag === 0x0002 || tag === 0x0004) { // Lat / Lon
            const dataOffset = read32(valueOffset)
            const readRational = (o) => {
              const num = isLE ? view.getUint32(tiffBase + o, true) : view.getUint32(tiffBase + o)
              const den = isLE ? view.getUint32(tiffBase + o + 4, true) : view.getUint32(tiffBase + o + 4)
              return den !== 0 ? num / den : 0
            }
            tags[tag] = [
              readRational(dataOffset),
              readRational(dataOffset + 8),
              readRational(dataOffset + 16),
            ]
          }
        }

        if (tags[0x0002] && tags[0x0004]) {
          const toDecimal = ([d, m, s]) => d + m / 60 + s / 3600
          let lat = toDecimal(tags[0x0002])
          let lng = toDecimal(tags[0x0004])
          if (tags[0x0001] === 'S') lat = -lat
          if (tags[0x0003] === 'W') lng = -lng
          if (lat !== 0 && lng !== 0) return { lat, lng }
        }
        break
      }
      if ((marker & 0xFF00) !== 0xFF00) break
      offset += view.getUint16(offset)
    }
  } catch (_) {}
  return null
}

// ── Fetch current weather conditions from open-meteo ─────────────────────────
async function fetchConditionsSnapshot() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,windspeed_10m,winddirection_10m` +
      `&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FChicago`
    const res  = await fetch(url)
    if (!res.ok) throw new Error()
    const json = await res.json()
    const c    = json.current
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
    const wind_dir = dirs[Math.round(c.winddirection_10m / 22.5) % 16]
    return {
      air_temp_f: Math.round(c.temperature_2m),
      wind_mph:   Math.round(c.windspeed_10m),
      wind_dir,
    }
  } catch (_) {
    return null
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CatchLogger({ onDone, onCancel }) {
  const { user, session } = useAuth()

  // Step: 'pick' | 'capturing' | 'review' | 'saving' | 'done'
  const [step, setStep] = useState('pick')

  // Photo
  const [file, setFile]         = useState(null)
  const [previewUrl, setPreview] = useState(null)
  const fileInputRef             = useRef()

  // Auto-captured
  const [location, setLocation]     = useState({ lat: null, lng: null, source: 'none' })
  const [conditions, setConditions] = useState({
    tide_state: '', tide_height_ft: '', water_temp_f: '',
    air_temp_f: '', wind_mph: '', wind_dir: '',
  })
  const [conditionsOk, setConditionsOk] = useState(false)

  // Review form fields
  const [species, setSpecies]       = useState('')
  const [otherSpecies, setOther]    = useState('')
  const [lengthIn, setLength]       = useState('')
  const [weightLb, setWeight]       = useState('')
  const [bait, setBait]             = useState('')
  const [notes, setNotes]           = useState('')
  const [caption, setCaption]       = useState('')
  const [hideMetadata, setHideMeta] = useState(false)
  const [shareToFeed, setShare]     = useState(false)
  const [spots, setSpots]           = useState([])
  const [spotId, setSpotId]         = useState('')

  // Save state
  const [uploading, setUploading]   = useState(false)
  const [uploadErr, setUploadErr]   = useState(false)

  // Fetch spots for dropdown
  useEffect(() => {
    supabase.from('fishing_spots').select('id, name').order('name')
      .then(({ data }) => { if (data) setSpots(data) })
  }, [])

  async function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep('capturing')

    const [locationResult, exifResult, tideResult, tempResult, weatherResult] = await Promise.all([
      // GPS location
      new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        )
      }),
      // EXIF GPS
      extractExifGps(f),
      // NOAA tide
      getCurrentTideState(),
      // Water temp
      getWaterTemp(),
      // Weather
      fetchConditionsSnapshot(),
    ])

    // Resolve location: GPS → EXIF → none
    let loc
    if (locationResult?.lat) {
      loc = locationResult
    } else if (exifResult?.lat) {
      loc = { ...exifResult, source: 'exif' }
    } else {
      loc = { lat: null, lng: null, source: 'none' }
    }
    setLocation(loc)

    // Conditions
    const tideOk = tideResult?.ok
    const merged = {
      tide_state:    tideOk ? tideResult.state : '',
      tide_height_ft: tideOk ? String(tideResult.height_ft) : '',
      water_temp_f:  tempResult?.temp_f != null ? String(tempResult.temp_f) : '',
      air_temp_f:    weatherResult?.air_temp_f != null ? String(weatherResult.air_temp_f) : '',
      wind_mph:      weatherResult?.wind_mph   != null ? String(weatherResult.wind_mph) : '',
      wind_dir:      weatherResult?.wind_dir   ?? '',
    }
    setConditions(merged)
    setConditionsOk(tideOk && tempResult?.ok !== false)

    setStep('review')
  }

  function conditionLabel() {
    if (location.source === 'gps')  return 'Located via GPS'
    if (location.source === 'exif') return 'Location from photo'
    return 'Location not set'
  }

  async function handleSave() {
    setUploading(true)
    setUploadErr(false)
    try {
      const token = session?.access_token
      const { uploadUrl, r2Key, publicUrl } = await getUploadUrl({
        filename: file.name,
        contentType: file.type,
        token,
      })
      await uploadToR2(uploadUrl, file)

      const finalSpecies = species === 'Other' ? otherSpecies : species
      const caughtAt = new Date().toISOString()

      await supabase.from('fishing_catches').insert({
        photo_url:           publicUrl,
        r2_key:              r2Key,
        lat:                 location.lat,
        lng:                 location.lng,
        location_source:     location.source,
        spot_id:             spotId || null,
        species:             finalSpecies || null,
        length_in:           lengthIn ? parseFloat(lengthIn) : null,
        weight_lb:           weightLb ? parseFloat(weightLb) : null,
        bait:                bait || null,
        notes:               notes || null,
        caption:             caption || null,
        tide_state:          conditions.tide_state || null,
        tide_height_ft:      conditions.tide_height_ft ? parseFloat(conditions.tide_height_ft) : null,
        water_temp_f:        conditions.water_temp_f  ? parseFloat(conditions.water_temp_f) : null,
        air_temp_f:          conditions.air_temp_f    ? parseFloat(conditions.air_temp_f) : null,
        wind_mph:            conditions.wind_mph      ? parseFloat(conditions.wind_mph) : null,
        wind_dir:            conditions.wind_dir || null,
        conditions_fetched_ok: conditionsOk,
        hide_metadata:       hideMetadata,
        shared_to_feed:      shareToFeed,
        caught_at:           caughtAt,
        caught_by:           user?.id,
      })

      setStep('done')
      setTimeout(() => onDone?.(), 1200)
    } catch (err) {
      console.error('Save failed:', err)
      setUploadErr(true)
    } finally {
      setUploading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (step === 'pick') {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎣</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)', fontSize: '22px', marginBottom: '8px' }}>
          Log a Catch
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Take or choose a photo to get started.
        </p>
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            display: 'block', width: '100%', height: '52px',
            background: 'var(--color-teal)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-body)',
            cursor: 'pointer', marginBottom: '12px',
          }}
        >
          📷  Choose / Take Photo
        </button>
        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Cancel
          </button>
        )}
      </div>
    )
  }

  if (step === 'capturing') {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        {previewUrl && (
          <img src={previewUrl} alt="preview"
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
        )}
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Getting location &amp; conditions…
        </p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '12px' }}>✓</div>
        <p style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)', fontSize: '20px' }}>
          Catch logged!
        </p>
      </div>
    )
  }

  // ── Review card ──────────────────────────────────────────────────────────────
  const inp = {
    width: '100%', height: '44px', padding: '0 12px',
    border: '1.5px solid var(--color-border)', borderRadius: '10px',
    fontFamily: 'var(--font-body)', fontSize: '14px',
    color: 'var(--color-text)', background: 'white', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Photo preview */}
      {previewUrl && (
        <img src={previewUrl} alt="catch"
          style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }} />
      )}

      <div style={{ padding: '16px 16px 0' }}>

        {/* Amber warning if conditions failed */}
        {!conditionsOk && (
          <div style={{
            background: '#FFF3CD', border: '1px solid #FFC107',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', fontFamily: 'var(--font-body)', color: '#664d03',
          }}>
            Couldn't auto-fill conditions — add them manually if you like.
          </div>
        )}

        {/* Location */}
        <Row label="📍 Location">
          <p style={{ fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--color-navy)', margin: 0 }}>
            {conditionLabel()}
            {location.lat && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginLeft: 8 }}>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            )}
          </p>
        </Row>

        {/* Tide */}
        <Row label="🌊 Tide">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={{ ...inp, flex: 1 }}
              placeholder="rising / falling / high / low"
              value={conditions.tide_state}
              onChange={e => setConditions(c => ({ ...c, tide_state: e.target.value }))}
            />
            <input
              style={{ ...inp, width: '90px', flex: 'none' }}
              placeholder="ft"
              type="number"
              value={conditions.tide_height_ft}
              onChange={e => setConditions(c => ({ ...c, tide_height_ft: e.target.value }))}
            />
          </div>
        </Row>

        {/* Conditions */}
        <Row label="🌡️ Conditions">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input style={{ ...inp, width: '80px', flex: 'none' }} placeholder="Water °F" type="number"
              value={conditions.water_temp_f}
              onChange={e => setConditions(c => ({ ...c, water_temp_f: e.target.value }))} />
            <input style={{ ...inp, width: '80px', flex: 'none' }} placeholder="Air °F" type="number"
              value={conditions.air_temp_f}
              onChange={e => setConditions(c => ({ ...c, air_temp_f: e.target.value }))} />
            <input style={{ ...inp, width: '80px', flex: 'none' }} placeholder="mph" type="number"
              value={conditions.wind_mph}
              onChange={e => setConditions(c => ({ ...c, wind_mph: e.target.value }))} />
            <input style={{ ...inp, width: '70px', flex: 'none' }} placeholder="dir"
              value={conditions.wind_dir}
              onChange={e => setConditions(c => ({ ...c, wind_dir: e.target.value }))} />
          </div>
        </Row>

        {/* Species */}
        <Row label="🐟 Species">
          <select
            style={{ ...inp, cursor: 'pointer' }}
            value={species}
            onChange={e => { setSpecies(e.target.value); if (e.target.value !== 'Other') setOther('') }}
          >
            <option value="">— select species —</option>
            {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {species === 'Other' && (
            <input
              style={{ ...inp, marginTop: '8px' }}
              placeholder="Species name"
              value={otherSpecies}
              onChange={e => setOther(e.target.value)}
            />
          )}
        </Row>

        {/* Measurements */}
        <Row label="📏 Size (optional)">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={{ ...inp, flex: 1 }} placeholder='Length (in)' type="number" value={lengthIn} onChange={e => setLength(e.target.value)} />
            <input style={{ ...inp, flex: 1 }} placeholder='Weight (lb)' type="number" value={weightLb} onChange={e => setWeight(e.target.value)} />
          </div>
        </Row>

        {/* Bait */}
        <Row label="🪝 Bait (optional)">
          <input style={inp} placeholder="e.g. live shrimp, topwater" value={bait} onChange={e => setBait(e.target.value)} />
        </Row>

        {/* Notes + Caption */}
        <Row label="📝 Notes (optional)">
          <input style={inp} placeholder="Any notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </Row>
        <Row label="💬 Caption (optional)">
          <input style={inp} placeholder="Caption for the feed" value={caption} onChange={e => setCaption(e.target.value)} />
        </Row>

        {/* Spot link */}
        {spots.length > 0 && (
          <Row label="📌 Spot (optional)">
            <select style={{ ...inp, cursor: 'pointer' }} value={spotId} onChange={e => setSpotId(e.target.value)}>
              <option value="">— link to a spot —</option>
              {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Row>
        )}

        {/* Toggles */}
        <div style={{ marginBottom: '16px' }}>
          <Toggle
            checked={hideMetadata}
            onChange={setHideMeta}
            label="Don't show fishing metadata"
            sub="Hides tide, location, temp on display (data still stored)"
          />
          <Toggle
            checked={shareToFeed}
            onChange={setShare}
            label="Share to family feed"
            sub="Appears in the Fishing gallery"
          />
        </div>

        {uploadErr && (
          <div style={{
            background: '#FDECEA', border: '1px solid var(--color-coral)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
            fontSize: '13px', color: 'var(--color-coral)', fontFamily: 'var(--font-body)',
          }}>
            Upload failed — check your connection.
          </div>
        )}

        <button
          onClick={uploadErr ? handleSave : handleSave}
          disabled={uploading}
          style={{
            width: '100%', height: '50px',
            background: uploading ? 'var(--color-teal-light, #7ecfe0)' : 'var(--color-teal)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-body)',
            cursor: uploading ? 'default' : 'pointer',
          }}
        >
          {uploading ? 'Saving…' : uploadErr ? 'Retry' : 'Save Catch'}
        </button>

        {onCancel && (
          <button onClick={onCancel} style={{
            display: 'block', width: '100%', marginTop: '10px',
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Cancel
          </button>
        )}

      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)', letterSpacing: '0.4px',
        textTransform: 'uppercase', marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, sub }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px 0', cursor: 'pointer',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 26, borderRadius: 13, flexShrink: 0, marginTop: 1,
          background: checked ? 'var(--color-teal)' : 'var(--color-sand-200, #E0D5C0)',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: checked ? 21 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--color-navy)', fontWeight: 500 }}>
          {label}
        </p>
        {sub && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </label>
  )
}
