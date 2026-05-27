import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'

export default function AnnouncementForm({ announcement = null, onSave, onClose }) {
  const { profile } = useAuth()
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

  const [title,      setTitle]      = useState(announcement?.title       ?? '')
  const [body,       setBody]       = useState(announcement?.body        ?? '')
  const [pinned,     setPinned]     = useState(announcement?.pinned      ?? false)
  const [authorName, setAuthorName] = useState(announcement?.author_name ?? profile?.display_name ?? '')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a title.'); return }
    if (!body.trim())  { setError('Please enter a message.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      title:       title.trim(),
      body:        body.trim(),
      pinned,
      author_name: authorName.trim() || 'Phillips House',
    }

    let err
    if (announcement?.id) {
      ;({ error: err } = await supabase.from('announcements').update(payload).eq('id', announcement.id))
    } else {
      ;({ error: err } = await supabase.from('announcements').insert({ ...payload, author_id: (await supabase.auth.getUser()).data.user?.id }))
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
            {announcement ? 'Edit Announcement' : 'New Announcement'}
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
              placeholder="e.g. Dock repairs this weekend" style={inputStyle} autoFocus />
          </Field>

          <Field label="Message">
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="What does everyone need to know?"
              rows={5}
              style={{ ...inputStyle, height: 'auto', resize: 'none', lineHeight: 1.6, paddingTop: '10px', paddingBottom: '10px' }} />
          </Field>

          <Field label="Posted by">
            <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Name" style={inputStyle} />
          </Field>

          {/* Pin toggle */}
          <button
            onClick={() => setPinned((p) => !p)}
            style={{
              width: '100%', height: '48px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${pinned ? 'var(--color-coral)' : 'var(--color-border)'}`,
              background: pinned ? '#fdecea' : 'var(--color-sand-50)',
              cursor: 'pointer', marginBottom: '16px',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: pinned ? 'var(--color-coral)' : 'var(--color-text-muted)' }}>
              📌 Pin to top
            </span>
            <div style={{
              width: 40, height: 24, borderRadius: 12,
              background: pinned ? 'var(--color-coral)' : 'var(--color-sand-200)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: pinned ? 19 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </button>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>{error}</p>}
        </div>

        <div style={{ padding: '12px 20px', paddingBottom: isDesktop ? '20px' : 'calc(12px + var(--safe-bottom))' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}>
            {saving ? 'Saving…' : announcement ? 'Save Changes' : 'Post Announcement'}
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
