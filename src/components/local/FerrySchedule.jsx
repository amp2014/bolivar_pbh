// Galveston–Bolivar ferry schedule approximation.
// Peak 6am–9pm: ~20 min | Evening 9pm–midnight: ~30 min | Night 1am–6am: ~60 min

function ferryInterval(hour) {
  if (hour >= 6 && hour < 21) return 20
  if (hour >= 21 || hour < 1) return 30
  return 60
}

function getNextDepartures(baseOffsetMins = 0, count = 5) {
  const now = new Date()
  const baseMins = now.getHours() * 60 + now.getMinutes() + baseOffsetMins
  const departures = []
  let cursor = baseMins

  for (let i = 0; i < count; i++) {
    const hour = Math.floor(cursor / 60) % 24
    const interval = ferryInterval(hour)
    const next = Math.ceil((cursor + 1) / interval) * interval
    const h = Math.floor(next / 60) % 24
    const m = next % 60
    const period = h < 12 ? 'AM' : 'PM'
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h
    const minsFromNow = next - baseMins + baseOffsetMins
    departures.push({
      time: `${dh}:${m.toString().padStart(2, '0')} ${period}`,
      minsFromNow,
      interval,
    })
    cursor = next
  }
  return departures
}

function minutesLabel(m) {
  if (m <= 1) return 'Now'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

export default function FerrySchedule() {
  const galvDeps  = getNextDepartures(0,  5)
  const bolivDeps = getNextDepartures(10, 5)
  const interval  = galvDeps[0]?.interval ?? 20

  const intervalLabel = interval === 20 ? 'Peak hours (~20 min)' : interval === 30 ? 'Evening (~30 min)' : 'Overnight (~60 min)'

  return (
    <div>
      {/* Info card */}
      <div className="card" style={{ marginBottom: '12px', background: 'var(--color-teal-xlight)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>⛴️</span>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '2px' }}>
              Galveston–Bolivar Ferry
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-teal)', fontWeight: 600 }}>
              Free · 18 min crossing · 24/7
            </p>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-navy)', marginTop: '10px', lineHeight: 1.5, opacity: 0.75 }}>
          Schedule is approximate. Current frequency: <strong>{intervalLabel}</strong>. No reservations needed — first come, first served.
        </p>
      </div>

      {/* Two columns: Galveston + Bolivar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <DepartureColumn title="From Galveston" arrow="→" departures={galvDeps} />
        <DepartureColumn title="From Bolivar" arrow="←" departures={bolivDeps} />
      </div>

      {/* Tips */}
      <div className="card">
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy)', letterSpacing: '0.3px', marginBottom: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
          Tips
        </p>
        {[
          '🚗  Pull up close — attendants fill every row. Don\'t leave gaps.',
          '⏱️  Arrive 5–10 min early, especially summer weekends.',
          '🌊  Rough water? Crossing may be slower or temporarily suspended.',
          '📱  TxDOT alerts: drivetexas.org or call 511 for live status.',
        ].map((tip, i) => (
          <p key={i} style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: i < 3 ? '6px' : 0 }}>
            {tip}
          </p>
        ))}
      </div>
    </div>
  )
}

function DepartureColumn({ title, arrow, departures }) {
  return (
    <div className="card" style={{ padding: '12px' }}>
      <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
        {arrow} {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {departures.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px' }}>
            <span style={{
              fontSize: i === 0 ? '16px' : '13px',
              fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? 'var(--color-navy)' : 'var(--color-text)',
            }}>
              {d.time}
            </span>
            <span style={{
              fontSize: '10px',
              color: i === 0 ? 'var(--color-teal)' : 'var(--color-text-muted)',
              fontWeight: i === 0 ? 700 : 400,
              fontFamily: 'var(--font-mono)',
            }}>
              {minutesLabel(d.minsFromNow)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
