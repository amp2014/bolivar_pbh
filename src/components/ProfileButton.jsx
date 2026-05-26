import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function ProfileButton() {
  const { profile, role, signOut, updateProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [editingAddr, setEditingAddr] = useState(false)
  const [addrInput, setAddrInput]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveErr, setSaveErr]         = useState(false)

  async function saveAddress() {
    setSaving(true)
    setSaveErr(false)
    const { error } = await updateProfile({ home_address: addrInput.trim() || null })
    setSaving(false)
    if (error) { setSaveErr(true); return }
    setEditingAddr(false)
  }

  const avatarUrl = profile?.avatar_url
  const initials  = (profile?.display_name ?? '?')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Profile"
        style={{
          position: 'fixed',
          top: 'calc(var(--safe-top) + 16px)',
          right: '16px',
          width: 38, height: 38,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.3)',
          background: 'rgba(26,58,92,0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 150,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: 'white', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{initials}</span>
        }
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'white', borderRadius: '20px 20px 0 0',
            padding: '12px 24px calc(24px + var(--safe-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-sand-200)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--color-teal-xlight)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)' }}>{initials}</span>
                }
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--color-navy)' }}>
                  {profile?.display_name ?? 'Unknown'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {profile?.email} · <span style={{ textTransform: 'capitalize' }}>{role}</span>
                </p>
              </div>
            </div>
            {/* Home address */}
            <div style={{ marginBottom: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <p style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
                letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px',
              }}>
                Home Address
              </p>
              {editingAddr ? (
                <div>
                  <input
                    type="text"
                    value={addrInput}
                    onChange={(e) => setAddrInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveAddress(); if (e.key === 'Escape') setEditingAddr(false) }}
                    placeholder="123 Main St, Houston, TX 77019"
                    autoFocus
                    style={{
                      width: '100%', height: '44px', padding: '0 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--color-teal)',
                      background: 'var(--color-sand-50)',
                      fontFamily: 'var(--font-body)', fontSize: '14px',
                      color: 'var(--color-text)', outline: 'none',
                      boxSizing: 'border-box', marginBottom: '8px',
                    }}
                  />
                  {saveErr && (
                    <p style={{ fontSize: '12px', color: 'var(--color-coral)', marginBottom: '6px' }}>
                      Couldn't save — try again
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={saveAddress}
                      disabled={saving}
                      className="btn btn-teal"
                      style={{ flex: 1, height: '40px', fontSize: '14px' }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingAddr(false)}
                      style={{
                        flex: 1, height: '40px', fontSize: '14px',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        background: 'transparent', color: 'var(--color-text-muted)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <p style={{
                    fontSize: '14px', fontFamily: 'var(--font-body)', flex: 1,
                    color: profile?.home_address ? 'var(--color-navy)' : 'var(--color-text-muted)',
                  }}>
                    {profile?.home_address ?? 'Not set — add for drive time estimates'}
                  </p>
                  <button
                    onClick={() => { setAddrInput(profile?.home_address ?? ''); setEditingAddr(true) }}
                    style={{
                      fontSize: '13px', color: 'var(--color-teal)', fontWeight: 600,
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', flexShrink: 0,
                    }}
                  >
                    {profile?.home_address ? 'Edit' : 'Add'}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={signOut}
              className="btn btn-outline"
              style={{ width: '100%', height: '48px', fontSize: '15px', color: 'var(--color-coral)', borderColor: 'var(--color-coral)' }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  )
}
