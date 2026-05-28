import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Lazy-load map to avoid SSR issues and speed up initial render
const SpotMap = lazy(() => import('./SpotMap'))

const SPOT_TYPES = ['surf', 'jetty', 'pier', 'wade', 'boat', 'other']

const inp = {
  width: '100%', height: '44px', padding: '0 12px',
  border: '1.5px solid var(--color-border)', borderRadius: '10px',
  fontFamily: 'var(--font-body)', fontSize: '14px',
  color: 'var(--color-text)', background: 'white', outline: 'none',
  boxSizing: 'border-box',
}

export default function FishingSpots() {
  const { user, profile, isAdmin } = useAuth()
  const [spots, setSpots]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [selectedSpot, setSelected] = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [catchCounts, setCounts]    = useState({})

  // Add-spot form state
  const [pickedPin, setPickedPin]   = useState(null)
  const [spotName, setSpotName]     = useState('')
  const [spotType, setSpotType]     = useState('')
  const [spotNotes, setSpotNotes]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveErr, setSaveErr]       = useState(false)

  async function loadSpots() {
    setLoading(true)
    const { data } = await supabase
      .from('fishing_spots')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSpots(data)
    setLoading(false)

    // Load catch counts per spot
    if (data?.length) {
      const { data: counts } = await supabase
        .from('fishing_catches')
        .select('spot_id')
        .not('spot_id', 'is', null)
      if (counts) {
        const map = {}
        for (const row of counts) {
          map[row.spot_id] = (map[row.spot_id] ?? 0) + 1
        }
        setCounts(map)
      }
    }
  }

  useEffect(() => { loadSpots() }, [])

  const spotsWithCounts = spots.map(s => ({ ...s, catch_count: catchCounts[s.id] ?? 0 }))

  function openAdd() {
    setPickedPin(null)
    setSpotName('')
    setSpotType('')
    setSpotNotes('')
    setSaveErr(false)
    setShowAdd(true)
  }

  function cancelAdd() {
    setShowAdd(false)
    setPickedPin(null)
  }

  async function saveSpot() {
    if (!spotName.trim()) return
    if (!pickedPin) { setSaveErr('Drop a pin on the map first.'); return }
    setSaving(true)
    setSaveErr(false)
    const { error } = await supabase.from('fishing_spots').insert({
      name:       spotName.trim(),
      lat:        pickedPin.lat,
      lng:        pickedPin.lng,
      spot_type:  spotType || null,
      notes:      spotNotes || null,
      created_by: user?.id,
    })
    setSaving(false)
    if (error) { setSaveErr('Couldn\'t save — try again.'); return }
    setShowAdd(false)
    setPickedPin(null)
    loadSpots()
  }

  async function deleteSpot(spot) {
    if (!confirm(`Delete "${spot.name}"?`)) return
    await supabase.from('fishing_spots').delete().eq('id', spot.id)
    setSelected(null)
    loadSpots()
  }

  const canDelete = (spot) =>
    spot.created_by === user?.id || isAdmin

  // ── Render ──────────────────────────────────────────────────────────────────

  // Add-spot flow
  if (showAdd) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={cancelAdd} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', padding: 0, fontSize: '14px',
            fontFamily: 'var(--font-body)',
          }}>
            ← Back
          </button>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)', fontSize: '18px', margin: 0 }}>
            Add Fishing Spot
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
          Tap the map to drop a pin.
        </p>

        <Suspense fallback={<div style={{ height: 280, background: 'var(--color-sand-100)', borderRadius: 12 }} />}>
          <SpotMap
            mode="pick"
            pickedPin={pickedPin}
            onPick={setPickedPin}
            height={280}
          />
        </Suspense>

        {pickedPin && (
          <p style={{ fontSize: '12px', color: 'var(--color-teal)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            📍 {pickedPin.lat.toFixed(5)}, {pickedPin.lng.toFixed(5)}
          </p>
        )}

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            style={inp}
            placeholder="Spot name (required)"
            value={spotName}
            onChange={e => setSpotName(e.target.value)}
          />
          <select
            style={{ ...inp, cursor: 'pointer' }}
            value={spotType}
            onChange={e => setSpotType(e.target.value)}
          >
            <option value="">— spot type (optional) —</option>
            {SPOT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <textarea
            style={{ ...inp, height: '80px', padding: '10px 12px', resize: 'none' }}
            placeholder="Notes (optional)"
            value={spotNotes}
            onChange={e => setSpotNotes(e.target.value)}
          />

          {saveErr && (
            <p style={{ color: 'var(--color-coral)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>{saveErr}</p>
          )}

          <button
            onClick={saveSpot}
            disabled={saving || !spotName.trim() || !pickedPin}
            style={{
              height: '48px', background: 'var(--color-teal)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)',
              cursor: (saving || !spotName.trim() || !pickedPin) ? 'not-allowed' : 'pointer',
              opacity: (!spotName.trim() || !pickedPin) ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Spot'}
          </button>
        </div>
      </div>
    )
  }

  // Spot detail sheet
  if (selectedSpot) {
    const spot = spotsWithCounts.find(s => s.id === selectedSpot.id) ?? selectedSpot
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => setSelected(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', padding: 0, fontSize: '14px',
            fontFamily: 'var(--font-body)',
          }}>
            ← Back
          </button>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)', fontSize: '18px', margin: 0 }}>
            {spot.name}
          </h3>
        </div>

        {spot.spot_type && (
          <span style={{
            display: 'inline-block', fontSize: '11px', fontFamily: 'var(--font-mono)',
            background: 'var(--color-teal-xlight, #e8f4f8)', color: 'var(--color-teal)',
            borderRadius: '6px', padding: '3px 8px', marginBottom: '10px',
            textTransform: 'capitalize',
          }}>
            {spot.spot_type}
          </span>
        )}

        {spot.notes && (
          <p style={{ fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
            {spot.notes}
          </p>
        )}

        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: '16px' }}>
          {spot.catch_count ?? 0} {spot.catch_count === 1 ? 'catch' : 'catches'} at this spot
        </p>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center',
            background: 'var(--color-teal)', color: 'white',
            padding: '13px 0', borderRadius: 'var(--radius-full)',
            fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)',
            textDecoration: 'none', marginBottom: '8px',
          }}
        >
          🗺️ Get Directions
        </a>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', fontFamily: 'var(--font-body)', marginBottom: '16px' }}>
          Opens in Google Maps.
        </p>

        {canDelete(spot) && (
          <button
            onClick={() => deleteSpot(spot)}
            style={{
              display: 'block', width: '100%', height: '44px',
              background: 'none', border: '1.5px solid var(--color-coral)',
              borderRadius: 'var(--radius-full)', color: 'var(--color-coral)',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
            }}
          >
            Delete Spot
          </button>
        )}
      </div>
    )
  }

  // Main view: map + spot list
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)', fontSize: '18px', margin: 0 }}>
          Fishing Spots
        </h3>
        <button
          onClick={openAdd}
          style={{
            background: 'var(--color-teal)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-full)', padding: '8px 16px',
            fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}
        >
          + Add Spot
        </button>
      </div>

      <Suspense fallback={<div style={{ height: 260, background: 'var(--color-sand-100)', borderRadius: 12 }} />}>
        <SpotMap
          mode="view"
          spots={spotsWithCounts}
          onSpotClick={setSelected}
          height={260}
        />
      </Suspense>

      {loading ? (
        <p style={{ padding: '16px 0', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '14px', textAlign: 'center' }}>
          Loading…
        </p>
      ) : spots.length === 0 ? (
        <p style={{ padding: '16px 0', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '14px', textAlign: 'center' }}>
          No spots yet — add one!
        </p>
      ) : (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {spotsWithCounts.map(spot => (
            <button
              key={spot.id}
              onClick={() => setSelected(spot)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: 'var(--color-sand-50, #fdfaf5)',
                border: '1px solid var(--color-border)', borderRadius: '12px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>
                  {spot.name}
                </p>
                {spot.spot_type && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>
                    {spot.spot_type}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-teal)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {spot.catch_count ?? 0} {spot.catch_count === 1 ? 'catch' : 'catches'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
