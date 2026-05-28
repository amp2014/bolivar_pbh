import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLayout } from '../../contexts/LayoutContext'
import { maskPhone, rawPhone } from '../../lib/phone'

const CATEGORIES     = ['Restaurant', 'Bar', 'Beach', 'Fishing', 'Nature', 'Activity', 'Shopping', 'Day Trip', 'Other']
const LOCATION_AREAS = ['Bolivar', 'Crystal Beach', 'Galveston', 'Other']

export default function LocalFavoriteForm({ item = null, onSave, onClose }) {
  const { isDesktop } = useLayout()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  const [name,         setName]         = useState(item?.name         ?? '')
  const [category,     setCategory]     = useState(item?.category     ?? 'Restaurant')
  const [locationArea, setLocationArea] = useState(item?.location_area ?? 'Bolivar')
  const [description,  setDescription]  = useState(item?.description  ?? '')
  const [address,      setAddress]      = useState(item?.address      ?? '')
  const [phone,        setPhone]        = useState(maskPhone(item?.phone ?? ''))
  const [website,      setWebsite]      = useState(item?.website      ?? '')
  const [notes,        setNotes]        = useState(item?.notes        ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError('Please enter a name.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      name:          name.trim(),
      category,
      location_area: locationArea,
      description:   description.trim() || null,
      address:       address.trim()     || null,
      phone:         rawPhone(phone)     || null,
      website:       website.trim()     || null,
      notes:         notes.trim()       || null,
    }

    let err
    if (item?.id) {
      ;({ error: err } = await supabase.from('local_favorites').update(payload).eq('id', item.id))
    } else {
      ;({ error: err } = await supabase.from('local_favorites').insert(payload))
    }

    if (err) { setError(err.message); setSaving(false); return }
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
        position: 'fixed',
        ...(isDesktop
          ? { top: '50%', left: '50%', right: 'auto', bottom: 'auto', maxWidth: '560px', width: 'calc(100% - 32px)', borderRadius: '16px', transform: visible ? 'translate(-50%, -50%)' : 'translate(-50%, calc(-50% + 24px))', opacity: visible ? 1 : 0 }
          : { bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', transform: visible ? 'translateY(0)' : 'translateY(100%)' }
        ),
        background: 'white', zIndex: 201, maxHeight: isDesktop ? '90dvh' : '92dvh',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.32s',
      }}>
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-sand-200)' }} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '21px', fontWeight: 700, color: 'var(--color-navy)' }}>
            {item ? 'Edit Place' : 'Add Place'}
          </h2>
          <button onClick={dismiss} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-sand-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: 'var(--color-text-muted)',
            border: 'none', cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px', WebkitOverflowScrolling: 'touch' }}>

          <Field label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stingaree Restaurant" style={inputStyle} autoFocus />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Area">
              <select value={locationArea} onChange={(e) => setLocationArea(e.target.value)} style={selectStyle}>
                {LOCATION_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this place worth visiting?"
              rows={2}
              style={{ ...inputStyle, height: 'auto', resize: 'none', lineHeight: 1.5, paddingTop: '10px', paddingBottom: '10px' }} />
          </Field>

          <Field label="Address (optional)">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address" style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Phone (optional)">
              <input type="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(409) 555-0000" style={inputStyle} inputMode="numeric" />
            </Field>
            <Field label="Website (optional)">
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…" style={inputStyle} />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Tips, hours, cash only, etc." style={inputStyle} />
          </Field>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>{error}</p>}
        </div>

        <div style={{ padding: '12px 20px', paddingBottom: isDesktop ? '20px' : 'calc(12px + var(--safe-bottom))' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}>
            {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Place'}
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
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px',
}
