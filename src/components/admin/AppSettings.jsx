import { useEffect, useState } from 'react'
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
  )
}
