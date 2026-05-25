import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const ROLES = ['guest', 'family', 'admin']

const ROLE_LABEL = { guest: 'Guest', family: 'Family', admin: 'Admin' }

export default function UserList() {
  const { user: currentUser } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState({}) // { [userId]: bool }

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      const { data } = await supabase
        .from('users')
        .select('id, display_name, email, avatar_url, role, created_at')
        .order('created_at')
      setUsers(data ?? [])
      setLoading(false)
    }
    fetchUsers()
  }, [])

  async function changeRole(userId, newRole) {
    setSaving((s) => ({ ...s, [userId]: true }))
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    setSaving((s) => ({ ...s, [userId]: false }))
  }

  if (loading) return <SkeletonList />

  if (users.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
        No users found.
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
        {users.length} {users.length === 1 ? 'user' : 'users'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.map((u) => {
          const isSelf    = u.id === currentUser?.id
          const isSaving  = saving[u.id]
          const initials  = (u.display_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

          return (
            <div key={u.id} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  overflow: 'hidden', background: 'var(--color-teal-xlight)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy)' }}>{initials}</span>
                  }
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p style={{
                      fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)',
                      fontFamily: 'var(--font-body)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.display_name ?? 'Unknown'}
                    </p>
                    {isSelf && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, color: 'var(--color-teal)',
                        background: 'var(--color-teal-xlight)',
                        padding: '1px 6px', borderRadius: 'var(--radius-full)',
                        letterSpacing: '0.3px', flexShrink: 0,
                      }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '12px', color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {u.email}
                  </p>
                </div>
              </div>

              {/* Role switcher */}
              <div style={{
                display: 'flex', gap: '4px', marginTop: '10px',
                opacity: isSelf || isSaving ? 0.45 : 1,
                pointerEvents: isSelf || isSaving ? 'none' : 'auto',
                transition: 'opacity 0.15s',
              }}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => changeRole(u.id, r)}
                    style={{
                      flex: 1, height: '30px',
                      borderRadius: 'var(--radius-full)',
                      border: u.role === r ? 'none' : '1px solid var(--color-border)',
                      background: u.role === r ? 'var(--color-navy)' : 'transparent',
                      color: u.role === r ? 'white' : 'var(--color-text-muted)',
                      fontSize: '12px', fontWeight: u.role === r ? 600 : 400,
                      fontFamily: 'var(--font-body)', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>

              {isSelf && (
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                  You can't change your own role.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: '12px 14px', opacity: 1 - (i - 1) * 0.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-sand-100)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 13, width: '40%', background: 'var(--color-sand-100)', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 11, width: '60%', background: 'var(--color-sand-100)', borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
            {[1, 2, 3].map((j) => (
              <div key={j} style={{ flex: 1, height: 30, background: 'var(--color-sand-100)', borderRadius: 20 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
