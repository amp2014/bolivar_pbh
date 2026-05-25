import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['Bathroom', 'Bedroom', 'Food & Drinks', 'Kitchen', 'Laundry', 'Outdoor', 'Paper & Cleaning', 'Other']

const STATUSES = [
  { value: 'good', label: 'Good', color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
  { value: 'low',  label: 'Low',  color: '#b8860b',            bg: '#fff8e1' },
  { value: 'out',  label: 'Out',  color: 'var(--color-coral)', bg: '#fdecea' },
]

export default function SupplyForm({ supply = null, onSave, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  const [name,      setName]      = useState(supply?.name     ?? '')
  const [category,  setCategory]  = useState(supply?.category ?? 'Kitchen')
  const [status,    setStatus]    = useState(supply?.status   ?? 'good')
  const [saving,    setSaving]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error,     setError]     = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError('Please enter a name.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name: name.trim(),
      category,
      status,
      updated_at: new Date().toISOString(),
    }

    let err
    if (supply?.id) {
      ;({ error: err } = await supabase.from('supplies').update(payload).eq('id', supply.id))
    } else {
      ;({ error: err } = await supabase.from('supplies').insert(payload))
    }

    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  async function handleDelete() {
    setSaving(true)
    await supabase.from('supplies').delete().eq('id', supply.id)
    onSave()
  }

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
            {supply ? 'Edit Supply' : 'Add Supply'}
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
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paper Towels" style={inputStyle} autoFocus
            />
          </Field>

          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <div style={{ display: 'flex', gap: '8px' }}>
              {STATUSES.map((s) => (
                <button key={s.value} onClick={() => setStatus(s.value)} style={{
                  flex: 1, height: '40px', borderRadius: 'var(--radius-full)',
                  border: status === s.value ? 'none' : '1.5px solid var(--color-border)',
                  background: status === s.value ? s.bg : 'transparent',
                  color: status === s.value ? s.color : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>{error}</p>}

          {supply?.id && (
            <div style={{ marginTop: '8px', marginBottom: '8px' }}>
              {confirmDel ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Remove this supply?</span>
                  <button onClick={handleDelete} disabled={saving} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Delete</button>
                  <button onClick={() => setConfirmDel(false)} style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} style={{ fontSize: '13px', color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: '32px' }}>
                  Delete supply…
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{ padding: '12px 20px', paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}>
            {saving ? 'Saving…' : supply ? 'Save Changes' : 'Add Supply'}
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
