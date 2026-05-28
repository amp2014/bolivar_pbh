import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useNavConfig } from '../../contexts/NavConfigContext'
import { FEATURES, FEATURES_LIST } from '../../config/navFeatures'

// Features that can be pinned (not home, not admin-only-concepts like 'more')
const PINNABLE = FEATURES_LIST.filter(f => !f.fixed && f.key !== 'admin')

function MiniBar({ pinned }) {
  const slots = [
    FEATURES.home,
    ...pinned.slice(0, 3).map(k => FEATURES[k]).filter(Boolean),
  ]
  // pad to 4 if needed
  while (slots.length < 4) slots.push(null)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      background: 'white',
      border: '1.5px solid var(--color-border)',
      borderRadius: '14px',
      padding: '10px 8px',
      marginBottom: '20px',
    }}>
      {slots.map((f, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          flex: 1,
          opacity: f ? 1 : 0.25,
        }}>
          <span style={{ color: 'var(--color-teal)', lineHeight: 1 }}>
            {f ? f.icon(20) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
              </svg>
            )}
          </span>
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.3px' }}>
            {f ? f.label : '—'}
          </span>
        </div>
      ))}
      {/* More slot — always fixed */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
        <span style={{ color: 'var(--color-text-muted)', lineHeight: 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5"  cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </span>
        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.3px' }}>More</span>
      </div>
    </div>
  )
}

export default function NavBarCustomizer() {
  const { user } = useAuth()
  const { rawPinnedKeys, refetch } = useNavConfig()

  const [pinnedKeys, setPinnedKeys] = useState([...rawPinnedKeys])
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveErr,    setSaveErr]    = useState(false)

  // Sync if rawPinnedKeys changes (e.g. first load)
  useEffect(() => {
    setPinnedKeys([...rawPinnedKeys])
  }, [rawPinnedKeys.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const available = PINNABLE.filter(f => !pinnedKeys.includes(f.key))
  const maxReached = pinnedKeys.length >= 3

  function moveUp(idx) {
    if (idx === 0) return
    setPinnedKeys(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setSaved(false)
  }

  function moveDown(idx) {
    setPinnedKeys(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
    setSaved(false)
  }

  function removePin(key) {
    setPinnedKeys(prev => prev.filter(k => k !== key))
    setSaved(false)
  }

  function addPin(key) {
    if (maxReached) return
    if (!FEATURES[key]) return
    setPinnedKeys(prev => [...prev, key])
    setSaved(false)
  }

  async function saveLayout() {
    // Validate keys against registry before saving
    const validKeys = pinnedKeys.filter(k => FEATURES[k] && k !== 'home').slice(0, 3)
    setSaving(true)
    setSaveErr(false)
    const { error } = await supabase
      .from('nav_settings')
      .update({
        pinned_items: validKeys,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null) // update the single row
    setSaving(false)
    if (error) {
      setSaveErr(true)
      return
    }
    setSaved(true)
    await refetch() // refresh all nav consumers
  }

  return (
    <div>
      <p style={{
        fontSize: '11px', fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)', letterSpacing: '0.5px',
        textTransform: 'uppercase', fontWeight: 600,
        marginBottom: '16px',
      }}>
        Bottom Bar Layout
      </p>

      {/* Live preview */}
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: '8px' }}>
        Preview
      </p>
      <MiniBar pinned={pinnedKeys} />

      {/* Pinned list */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{
          fontSize: '11px', fontFamily: 'var(--font-mono)',
          color: 'var(--color-navy)', letterSpacing: '0.4px',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px',
        }}>
          Pinned ({pinnedKeys.length}/3)
        </p>
        {pinnedKeys.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', padding: '8px 0' }}>
            No items pinned — add from available below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pinnedKeys.map((key, idx) => {
              const f = FEATURES[key]
              if (!f) return null
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px',
                  background: 'var(--color-sand-50, #fdfaf5)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                }}>
                  <span style={{ color: 'var(--color-navy)', lineHeight: 1 }}>
                    {f.icon(18)}
                  </span>
                  <span style={{ flex: 1, fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--color-navy)' }}>
                    {f.label}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      title="Move up"
                      style={{
                        width: 28, height: 28, border: '1px solid var(--color-border)',
                        borderRadius: '6px', background: 'white', cursor: idx === 0 ? 'default' : 'pointer',
                        opacity: idx === 0 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx >= pinnedKeys.length - 1}
                      title="Move down"
                      style={{
                        width: 28, height: 28, border: '1px solid var(--color-border)',
                        borderRadius: '6px', background: 'white',
                        cursor: idx >= pinnedKeys.length - 1 ? 'default' : 'pointer',
                        opacity: idx >= pinnedKeys.length - 1 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => removePin(key)}
                      title="Remove"
                      style={{
                        width: 28, height: 28, border: '1px solid var(--color-border)',
                        borderRadius: '6px', background: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-coral)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Available list */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{
          fontSize: '11px', fontFamily: 'var(--font-mono)',
          color: 'var(--color-navy)', letterSpacing: '0.4px',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px',
        }}>
          Available
        </p>
        {available.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', padding: '8px 0' }}>
            All pinnable features are pinned.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {available.map((f) => (
              <div key={f.key} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px',
                background: 'white',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
              }}>
                <span style={{ color: 'var(--color-text-muted)', lineHeight: 1 }}>
                  {f.icon(18)}
                </span>
                <span style={{ flex: 1, fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--color-navy)' }}>
                  {f.label}
                </span>
                <button
                  onClick={() => addPin(f.key)}
                  disabled={maxReached}
                  title={maxReached ? 'Remove a pinned item first' : 'Pin to bar'}
                  style={{
                    width: 28, height: 28, border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: maxReached ? 'var(--color-sand-100)' : 'var(--color-teal)',
                    cursor: maxReached ? 'not-allowed' : 'pointer',
                    opacity: maxReached ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: maxReached ? 'var(--color-text-muted)' : 'white',
                    transition: 'opacity 0.15s',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      {saveErr && (
        <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
          Couldn't save — try again.
        </p>
      )}
      <button
        onClick={saveLayout}
        disabled={saving}
        style={{
          width: '100%', height: '46px',
          background: saving ? 'var(--color-teal-light, #7ecfe0)' : saved ? '#2ecc71' : 'var(--color-teal)',
          color: 'white',
          border: 'none', borderRadius: 'var(--radius-full)',
          fontSize: '15px', fontWeight: 700,
          fontFamily: 'var(--font-body)', cursor: saving ? 'default' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Layout'}
      </button>
      {saved && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
          Change applies to all users on next load.
        </p>
      )}
    </div>
  )
}
