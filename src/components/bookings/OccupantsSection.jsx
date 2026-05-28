import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function initials(name) {
  return (name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const avatarColors = [
  { bg: '#e0f7fa', fg: '#1a3a5c' },
  { bg: '#d4f0e8', fg: '#1a3a5c' },
  { bg: '#fde8d8', fg: '#1a3a5c' },
  { bg: '#e8dfc8', fg: '#1a3a5c' },
]

// ── Main section (embedded in BookingCard) ───────────────────────────────────

export default function OccupantsSection({ booking }) {
  const { user, isAdmin } = useAuth()
  const [people, setPeople]       = useState(null) // null = loading
  const [showPicker, setShowPicker] = useState(false)

  const isBooker = booking.booked_by === user?.id
  const canEdit  = isBooker || isAdmin

  async function loadPeople() {
    const { data: booking_row } = await supabase
      .from('bookings')
      .select('booked_by, booked_by_name')
      .eq('id', booking.id)
      .single()

    if (!booking_row) { setPeople([]); return }

    const [{ data: bookerUser }, { data: occupants }] = await Promise.all([
      supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('id', booking_row.booked_by)
        .single(),
      supabase
        .from('stay_occupants')
        .select('user_id, users(id, display_name, avatar_url)')
        .eq('stay_id', booking.id),
    ])

    const list = []
    if (bookerUser) {
      list.push({ ...bookerUser, role: 'booker' })
    }
    for (const occ of (occupants ?? [])) {
      if (occ.users) list.push({ ...occ.users, user_id: occ.user_id, role: 'occupant' })
    }
    setPeople(list)
  }

  useEffect(() => { loadPeople() }, [booking.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function removeOccupant(userId) {
    await supabase
      .from('stay_occupants')
      .delete()
      .eq('stay_id', booking.id)
      .eq('user_id', userId)
    setPeople((prev) => prev.filter((p) => p.id !== userId))
  }

  if (people === null) return null // still loading — don't flash

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{
          fontSize: '10px', fontFamily: 'var(--font-mono)',
          letterSpacing: '1.5px', textTransform: 'uppercase',
          color: 'var(--color-text-muted)', fontWeight: 600,
        }}>
          Who's Staying
        </p>
        {canEdit && (
          <button
            onClick={() => setShowPicker(true)}
            style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--color-teal)',
              background: 'none', border: '1px solid var(--color-teal)',
              borderRadius: 'var(--radius-full)', padding: '3px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            + Add
          </button>
        )}
      </div>

      {people.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Just you — add others to tag them on this stay.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {people.map((p, i) => {
            const colors = avatarColors[i % avatarColors.length]
            const uid = p.id ?? p.user_id
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  overflow: 'hidden', background: colors.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '11px', fontWeight: 700, color: colors.fg }}>{initials(p.display_name)}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 500,
                    color: 'var(--color-navy)', fontFamily: 'var(--font-body)',
                  }}>
                    {p.display_name ?? 'Unknown'}
                  </span>
                  {p.role === 'booker' && (
                    <span style={{
                      marginLeft: '6px', fontSize: '10px', fontWeight: 700,
                      color: 'var(--color-teal)', background: 'var(--color-teal-xlight)',
                      padding: '1px 6px', borderRadius: 'var(--radius-full)',
                      letterSpacing: '0.3px',
                    }}>
                      BOOKER
                    </span>
                  )}
                </div>
                {canEdit && p.role === 'occupant' && (
                  <button
                    onClick={() => removeOccupant(uid)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-sand-50)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: '13px',
                      color: 'var(--color-text-muted)', flexShrink: 0,
                    }}
                    aria-label={`Remove ${p.display_name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showPicker && (
        <UserPickerSheet
          stayId={booking.id}
          existingIds={people.map((p) => p.id ?? p.user_id)}
          onAdded={() => { loadPeople(); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// ── User picker sheet ────────────────────────────────────────────────────────

function UserPickerSheet({ stayId, existingIds, onAdded, onClose }) {
  const { user: currentUser } = useAuth()
  const [allUsers, setAllUsers] = useState([])
  const [search, setSearch]     = useState('')
  const [adding, setAdding]     = useState(null)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    supabase
      .from('users')
      .select('id, display_name, email, avatar_url')
      .order('display_name')
      .then(({ data }) => setAllUsers(data ?? []))
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  // Exclude booker (currentUser in this context) and already-tagged
  const excluded = new Set([currentUser?.id, ...existingIds])
  const term = search.trim().toLowerCase()
  const filtered = allUsers.filter(
    (u) =>
      !excluded.has(u.id) &&
      (!term ||
        (u.display_name ?? '').toLowerCase().includes(term) ||
        (u.email ?? '').toLowerCase().includes(term))
  )

  async function addUser(u) {
    setAdding(u.id)
    const { error } = await supabase.from('stay_occupants').insert({
      stay_id: stayId,
      user_id: u.id,
      added_by: currentUser.id,
    })
    if (!error) {
      onAdded()
    } else {
      console.error('Failed to add occupant:', error.message)
      setAdding(null)
    }
  }

  return (
    <>
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
          zIndex: 300,
          opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white',
        borderRadius: '20px 20px 0 0',
        zIndex: 301,
        maxHeight: '75dvh',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
        paddingBottom: 'calc(16px + var(--safe-bottom, 0px))',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-sand-200)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)' }}>
            Add People
          </h3>
          <button
            onClick={dismiss}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-sand-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', color: 'var(--color-text-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 12px', position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '29px', top: '50%',
            transform: 'translateY(-50%)', fontSize: '14px',
            pointerEvents: 'none', opacity: 0.4,
          }}>🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            autoFocus
            style={{
              width: '100%', height: '40px',
              paddingLeft: '38px', paddingRight: '12px',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-sand-50)',
              fontFamily: 'var(--font-body)', fontSize: '14px',
              color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* User list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>
              {term ? 'No matching users.' : 'All app users are already on this stay.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.map((u) => {
                const isAdding = adding === u.id
                const ini = (u.display_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: 'white',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      overflow: 'hidden', background: 'var(--color-teal-xlight)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy)' }}>{ini}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>
                        {u.display_name ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </p>
                    </div>
                    <button
                      onClick={() => addUser(u)}
                      disabled={isAdding}
                      style={{
                        height: '32px', padding: '0 14px',
                        background: 'var(--color-teal)', color: 'white',
                        border: 'none', borderRadius: 'var(--radius-full)',
                        fontSize: '13px', fontWeight: 600,
                        fontFamily: 'var(--font-body)', cursor: isAdding ? 'default' : 'pointer',
                        opacity: isAdding ? 0.6 : 1, flexShrink: 0,
                      }}
                    >
                      {isAdding ? '…' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
