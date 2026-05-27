import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'
import ProjectForm from './ProjectForm'

const PRIORITY_META = {
  high:   { label: 'High',   color: 'var(--color-coral)', bg: '#fdecea' },
  medium: { label: 'Medium', color: '#b8860b',            bg: '#fff8e1' },
  low:    { label: 'Low',    color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
}

const STATUS_TABS = ['Open', 'In Progress', 'Done', 'All']
const TAB_VALUE = { 'Open': 'open', 'In Progress': 'in_progress', 'Done': 'done', 'All': null }

function formatDue(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, overdue: true }
  if (diff === 0) return { text: 'Due today', overdue: true }
  if (diff <= 7)  return { text: `Due in ${diff}d`, overdue: false }
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false }
}

export default function ProjectList() {
  const { isFamily } = useAuth()
  const { isDesktop } = useLayout()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('Open')
  const [expanded, setExpanded]   = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)
  const [marking, setMarking]     = useState(null)

  async function fetchProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    setProjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [])

  async function markDone(project) {
    setMarking(project.id)
    await supabase.from('projects').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', project.id)
    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status: 'done' } : p))
    setMarking(null)
    setExpanded(null)
  }

  async function handleDelete(id) {
    await supabase.from('projects').delete().eq('id', id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setConfirmDel(null)
    setExpanded(null)
  }

  const statusFilter = TAB_VALUE[tab]
  const filtered = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects

  const counts = {
    Open: projects.filter((p) => p.status === 'open').length,
    'In Progress': projects.filter((p) => p.status === 'in_progress').length,
    Done: projects.filter((p) => p.status === 'done').length,
  }

  return (
    <div>
      {/* Header row with Add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {projects.filter((p) => p.status !== 'done').length} active
          {counts.Done > 0 && ` · ${counts.Done} done`}
        </p>
        {isFamily && (
          <button
            onClick={() => { setEditProject(null); setShowForm(true) }}
            style={{
              height: '36px', padding: '0 16px',
              background: 'var(--color-teal)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: 300 }}>+</span>
            Add
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        background: 'var(--color-sand-100)',
        borderRadius: 'var(--radius-full)',
        padding: '4px', marginBottom: '16px',
      }}>
        {STATUS_TABS.map((t) => {
          const count = counts[t]
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, height: '36px',
              borderRadius: 'var(--radius-full)', border: 'none',
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? 'var(--color-navy)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)', fontSize: '12px',
              fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
              boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s',
            }}>
              {t}{count != null && count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} onAdd={isFamily ? () => { setEditProject(null); setShowForm(true) } : null} />
      ) : isDesktop ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Title', 'Priority', 'Status', 'Claimed by', 'Due', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, background: 'var(--color-sand-50)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((project, i) => {
                const pMeta = PRIORITY_META[project.priority] ?? PRIORITY_META.medium
                const isDone = project.status === 'done'
                const due = project.due_date ? formatDue(project.due_date) : null
                return (
                  <tr key={project.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: isDone ? 0.7 : 1 }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: isDone ? 'var(--color-text-muted)' : 'var(--color-navy)', textDecoration: isDone ? 'line-through' : 'none' }}>{project.title}</p>
                      {project.category && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>{project.category}</p>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {!isDone && <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: pMeta.bg, color: pMeta.color, fontSize: '10px', fontWeight: 700 }}>{pMeta.label}</span>}
                      {isDone && <span style={{ fontSize: '14px' }}>✓</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>{project.status.replace('_', ' ')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{project.assigned_to ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'var(--font-body)', color: due?.overdue ? 'var(--color-coral)' : 'var(--color-text-muted)', fontWeight: due?.overdue ? 600 : 400, whiteSpace: 'nowrap' }}>{due ? due.text : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {isFamily && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {!isDone && (
                            <button onClick={() => markDone(project)} disabled={marking === project.id} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-teal)', background: 'none', border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                              {marking === project.id ? '…' : '✓ Done'}
                            </button>
                          )}
                          <button onClick={() => { setEditProject(project); setShowForm(true) }} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-navy)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Edit</button>
                          <button onClick={() => setConfirmDel(project.id)} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: '1px solid var(--color-coral)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {confirmDel && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-sand-50)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Remove this project?</span>
              <button onClick={() => handleDelete(confirmDel)} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Delete</button>
              <button onClick={() => setConfirmDel(null)} style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Cancel</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map((project) => {
            const pMeta = PRIORITY_META[project.priority] ?? PRIORITY_META.medium
            const isOpen = expanded === project.id
            const isDone = project.status === 'done'
            const due = project.due_date ? formatDue(project.due_date) : null

            return (
              <div key={project.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: isDone ? 0.7 : 1 }}>
                {/* Priority stripe */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                  background: isDone ? 'var(--color-sand-200)' : pMeta.color,
                  borderRadius: '14px 0 0 14px',
                }} />

                <button
                  onClick={() => setExpanded(isOpen ? null : project.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: '8px',
                    padding: '10px 14px 10px 18px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500,
                      color: isDone ? 'var(--color-text-muted)' : 'var(--color-navy)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: '3px',
                    }}>
                      {project.title}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{project.category}</span>
                      {project.assigned_to && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>· {project.assigned_to}</span>
                      )}
                      {due && (
                        <span style={{ fontSize: '11px', color: due.overdue ? 'var(--color-coral)' : 'var(--color-text-muted)', fontWeight: due.overdue ? 600 : 400 }}>
                          · {due.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, paddingTop: '1px' }}>
                    {!isDone && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: pMeta.bg, color: pMeta.color,
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px',
                      }}>{pMeta.label}</span>
                    )}
                    {isDone && (
                      <span style={{ fontSize: '16px' }}>✓</span>
                    )}
                    <span style={{
                      color: 'var(--color-text-muted)', fontSize: '12px',
                      transition: 'transform 0.2s', display: 'inline-block',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>▾</span>
                  </div>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 14px 12px 18px', background: 'var(--color-sand-50)' }}>
                    {project.description && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '8px', lineHeight: 1.5 }}>
                        {project.description}
                      </p>
                    )}
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: isFamily ? '10px' : 0 }}>
                      Status: <span style={{ textTransform: 'capitalize' }}>{project.status.replace('_', ' ')}</span>
                      {' · '}Added {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    {isFamily && (
                      confirmDel === project.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Remove this project?</span>
                          <button onClick={() => handleDelete(project.id)} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Delete</button>
                          <button onClick={() => setConfirmDel(null)} style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          {!isDone && (
                            <button
                              onClick={() => markDone(project)}
                              disabled={marking === project.id}
                              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: '32px' }}
                            >
                              {marking === project.id ? 'Saving…' : '✓ Mark done'}
                            </button>
                          )}
                          <button onClick={() => { setEditProject(project); setShowForm(true) }} style={actionBtn}>Edit</button>
                          <button onClick={() => setConfirmDel(project.id)} style={{ ...actionBtn, color: 'var(--color-coral)' }}>Delete</button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ProjectForm
          project={editProject}
          onSave={() => { setShowForm(false); setEditProject(null); fetchProjects() }}
          onClose={() => { setShowForm(false); setEditProject(null) }}
        />
      )}
    </div>
  )
}

function EmptyState({ tab, onAdd }) {
  const msgs = {
    Open: 'No open projects — nice!',
    'In Progress': 'Nothing in progress right now.',
    Done: 'No completed projects yet.',
    All: 'No projects yet.',
  }
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔨</div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--color-navy)', marginBottom: '8px' }}>
        {msgs[tab] ?? 'No projects.'}
      </p>
      {onAdd && tab !== 'Done' && (
        <button onClick={onAdd} className="btn btn-teal" style={{ marginTop: '8px' }}>+ Add Project</button>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: '10px 14px 10px 18px', opacity: 1 - i * 0.15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ height: 14, width: '55%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 11, width: '35%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
            </div>
            <div style={{ height: 20, width: '15%', background: 'var(--color-sand-100)', borderRadius: 20 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const actionBtn = {
  fontSize: '13px', fontWeight: 500, color: 'var(--color-navy)',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: '32px',
}
