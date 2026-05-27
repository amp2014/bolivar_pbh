import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLayout } from '../../contexts/LayoutContext'

const CATEGORIES = ['Repair', 'Maintenance', 'Improvement', 'Purchase', 'Cleaning', 'General']

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: 'var(--color-coral)', bg: '#fdecea' },
  { value: 'medium', label: 'Medium', color: '#b8860b',            bg: '#fff8e1' },
  { value: 'low',    label: 'Low',    color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
]

const STATUSES = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
]

export default function ProjectForm({ project = null, onSave, onClose }) {
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

  const [title,      setTitle]      = useState(project?.title       ?? '')
  const [description,setDescription]= useState(project?.description ?? '')
  const [category,   setCategory]   = useState(project?.category    ?? 'General')
  const [priority,   setPriority]   = useState(project?.priority    ?? 'medium')
  const [status,     setStatus]     = useState(project?.status      ?? 'open')
  const [assignedTo, setAssignedTo] = useState(project?.assigned_to ?? '')
  const [dueDate,    setDueDate]    = useState(project?.due_date    ?? '')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a title.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      title:       title.trim(),
      description: description.trim() || null,
      category,
      priority,
      status,
      assigned_to: assignedTo.trim() || null,
      due_date:    dueDate || null,
      updated_at:  new Date().toISOString(),
    }

    let err
    if (project?.id) {
      ;({ error: err } = await supabase.from('projects').update(payload).eq('id', project.id))
    } else {
      ;({ error: err } = await supabase.from('projects').insert(payload))
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
            {project ? 'Edit Project' : 'Add Project'}
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

          <Field label="Title">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix screen door latch" style={inputStyle} autoFocus />
          </Field>

          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details…" rows={2}
              style={{ ...inputStyle, height: 'auto', resize: 'none', lineHeight: 1.5, paddingTop: '10px', paddingBottom: '10px' }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Due date (optional)">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Priority">
            <div style={{ display: 'flex', gap: '8px' }}>
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => setPriority(p.value)} style={{
                  flex: 1, height: '40px', borderRadius: 'var(--radius-full)',
                  border: priority === p.value ? 'none' : '1.5px solid var(--color-border)',
                  background: priority === p.value ? p.bg : 'transparent',
                  color: priority === p.value ? p.color : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>{p.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Status">
            <div style={{ display: 'flex', gap: '8px' }}>
              {STATUSES.map((s) => (
                <button key={s.value} onClick={() => setStatus(s.value)} style={{
                  flex: 1, height: '40px', borderRadius: 'var(--radius-full)',
                  border: status === s.value ? 'none' : '1.5px solid var(--color-border)',
                  background: status === s.value ? 'var(--color-navy)' : 'transparent',
                  color: status === s.value ? 'white' : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>{s.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Assigned to (optional)">
            <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Dad" style={inputStyle} />
          </Field>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>{error}</p>}
        </div>

        <div style={{ padding: '12px 20px', paddingBottom: isDesktop ? '20px' : 'calc(12px + var(--safe-bottom))' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}>
            {saving ? 'Saving…' : project ? 'Save Changes' : 'Add Project'}
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
