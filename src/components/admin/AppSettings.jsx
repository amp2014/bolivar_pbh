import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const SETTING_META = {
  guest_access: {
    label: 'Guest Access',
    description: 'Allow guests to log in and view the app.',
  },
}

export default function AppSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState({})

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true)
      const { data } = await supabase.from('app_settings').select('*')
      const map = {}
      ;(data ?? []).forEach((row) => { map[row.key] = row.value })
      setSettings(map)
      setLoading(false)
    }
    fetchSettings()
  }, [])

  async function toggle(key) {
    const newVal = settings[key] === 'true' ? 'false' : 'true'
    setSaving((s) => ({ ...s, [key]: true }))
    await supabase
      .from('app_settings')
      .upsert({ key, value: newVal }, { onConflict: 'key' })
    setSettings((prev) => ({ ...prev, [key]: newVal }))
    setSaving((s) => ({ ...s, [key]: false }))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ padding: '14px 16px', marginBottom: '8px' }}>
            <div style={{ height: 14, width: '35%', background: 'var(--color-sand-100)', borderRadius: 3, marginBottom: 6 }} />
            <div style={{ height: 11, width: '65%', background: 'var(--color-sand-100)', borderRadius: 3 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {Object.entries(SETTING_META).map(([key, meta], i, arr) => {
        const isOn   = settings[key] === 'true'
        const isLast = i === arr.length - 1

        return (
          <div
            key={key}
            style={{
              padding: '14px 16px',
              borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '15px', fontWeight: 600, color: 'var(--color-navy)',
                fontFamily: 'var(--font-body)', marginBottom: '2px',
              }}>
                {meta.label}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                {meta.description}
              </p>
            </div>

            {/* Sliding toggle */}
            <button
              onClick={() => toggle(key)}
              disabled={saving[key]}
              style={{
                width: 48, height: 28, borderRadius: 14, border: 'none',
                background: isOn ? 'var(--color-teal)' : 'var(--color-sand-200)',
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.2s',
                opacity: saving[key] ? 0.6 : 1,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3, left: isOn ? 23 : 3,
                width: 22, height: 22,
                borderRadius: '50%', background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s cubic-bezier(0.16,1,0.3,1)',
                display: 'block',
              }} />
            </button>
          </div>
        )
      })}
    </div>
    <WhatsNewEditor />
    </>
  )
}

// ── What's New editor ────────────────────────────────────────────────────────

const editorInputStyle = {
  width: '100%', padding: '0 12px',
  height: '40px',
  borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)',
  background: 'var(--color-sand-50)', fontFamily: 'var(--font-body)',
  fontSize: '14px', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
}

const editorLabelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: 'var(--color-text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.4px', marginBottom: '6px', fontFamily: 'var(--font-body)',
}

function WhatsNewEditor() {
  const [loading,  setLoading]  = useState(true)
  const [version,  setVersion]  = useState(1)
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const savedTimer = useRef(null)

  useEffect(() => {
    supabase.from('whats_new').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) { setVersion(data.version); setTitle(data.title); setContent(data.content) }
      setLoading(false)
    })
  }, [])

  async function publish() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    setSaved(false)
    const newVersion = version + 1
    const { error } = await supabase
      .from('whats_new')
      .update({ version: newVersion, title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (!error) {
      setVersion(newVersion)
      setSaved(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
        <div style={{ height: 13, width: '30%', background: 'var(--color-sand-100)', borderRadius: 3, marginBottom: 8 }} />
        <div style={{ height: 80, background: 'var(--color-sand-100)', borderRadius: 3 }} />
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '2px', fontFamily: 'var(--font-body)' }}>
        What's New
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: '16px' }}>
        Currently on <strong>v{version}</strong>. Publishing increments the version and shows the modal to all family members on their next login.
      </p>

      <div style={{ marginBottom: '12px' }}>
        <label style={editorLabelStyle}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={editorInputStyle}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={editorLabelStyle}>Content — one item per line, use • for bullets</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          style={{
            ...editorInputStyle, height: 'auto', resize: 'vertical',
            lineHeight: 1.5, paddingTop: '10px', paddingBottom: '10px',
          }}
        />
      </div>

      <button
        onClick={publish}
        disabled={saving || !title.trim() || !content.trim()}
        className="btn btn-primary"
        style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: 600 }}
      >
        {saving ? 'Publishing…' : saved ? 'Published ✓' : `Publish Update (v${version + 1})`}
      </button>
    </div>
  )
}
