import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['Appliances', 'Electronics', 'Furniture', 'Games', 'Kitchen', 'Linens', 'Outdoor', 'Other']
const LOCATIONS  = ['Kitchen', 'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bathroom', 'Patio', 'Garage', 'Laundry', 'Other']

export default function InventoryForm({ item = null, onSave, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  const [name,      setName]      = useState(item?.name      ?? '')
  const [category,  setCategory]  = useState(item?.category  ?? 'Furniture')
  const [condition, setCondition] = useState(item?.condition ?? 'good')
  const [location,  setLocation]  = useState(item?.location  ?? '')
  const [quantity,  setQuantity]  = useState(item?.quantity  ?? 1)
  const [notes,     setNotes]     = useState(item?.notes     ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError('Please enter a name.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      name: name.trim(),
      category,
      condition,
      location: location.trim() || null,
      quantity,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    }

    let err
    if (item?.id) {
      ;({ error: err } = await supabase.from('inventory').update(payload).eq('id', item.id))
    } else {
      ;({ error: err } = await supabase.from('inventory').insert(payload))
    }

    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const CONDITIONS = [
    { value: 'good',         label: 'Good',         color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
    { value: 'fair',         label: 'Fair',          color: '#b8860b',           bg: '#fff8e1' },
    { value: 'needs_repair', label: 'Needs Repair',  color: 'var(--color-coral)',bg: '#fdecea' },
  ]

  return (
    <>
      <div onClick={dismiss} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)', zIndex: 200,
        opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
      }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderRadius: '20px 20px 0 0',
        zIndex: 201, maxHeight: '92dvh',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-sand-200)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '21px', fontWeight: 700, color: 'var(--color-navy)' }}>
            {item ? 'Edit Item' : 'Add Item'}
          </h2>
          <button onClick={dismiss} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-sand-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: 'var(--color-text-muted)',
            border: 'none', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px', WebkitOverflowScrolling: 'touch' }}>

          <Field label="Item name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. King Bed Frame" style={inputStyle} autoFocus />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <select value={location} onChange={(e) => setLocation(e.target.value)} style={selectStyle}>
                <option value="">— none —</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Condition">
            <div style={{ display: 'flex', gap: '8px' }}>
              {CONDITIONS.map((c) => (
                <button key={c.value} onClick={() => setCondition(c.value)} style={{
                  flex: 1, height: '40px', borderRadius: 'var(--radius-full)',
                  border: condition === c.value ? 'none' : '1.5px solid var(--color-border)',
                  background: condition === c.value ? c.bg : 'transparent',
                  color: condition === c.value ? c.color : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>{c.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Quantity">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={counterBtn} aria-label="Decrease">−</button>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-navy)', minWidth: '28px', textAlign: 'center' }}>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} style={counterBtn} aria-label="Increase">+</button>
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details worth noting…" rows={2}
              style={{ ...inputStyle, height: 'auto', resize: 'none', lineHeight: 1.5, paddingTop: '10px', paddingBottom: '10px' }} />
          </Field>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>{error}</p>}
        </div>

        {/* Save */}
        <div style={{ padding: '12px 20px', paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}>
            {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block', fontSize: '12px', fontWeight: 600,
        color: 'var(--color-text-muted)', letterSpacing: '0.4px',
        textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'var(--font-body)',
      }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', height: '44px', padding: '0 14px',
  borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)',
  background: 'var(--color-sand-50)', fontFamily: 'var(--font-body)',
  fontSize: '15px', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  paddingRight: '36px',
}

const counterBtn = {
  width: 40, height: 40, borderRadius: '50%',
  border: '1.5px solid var(--color-border)', background: 'white',
  fontSize: '20px', color: 'var(--color-navy)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', lineHeight: 1, fontWeight: 300,
}
