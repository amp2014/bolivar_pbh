// Galveston–Bolivar ferry runs 24/7. Schedule is approximate:
// Peak 6am–9pm: ~every 20 min | Evening 9pm–midnight: ~every 30 min | Night: ~hourly

function ferryInterval(hour) {
  if (hour >= 6 && hour < 21) return 20
  if (hour >= 21 || hour < 1) return 30
  return 60
}

function nextDeparture(offsetFromNowMins = 0) {
  const now = new Date()
  const totalMins = now.getHours() * 60 + now.getMinutes() + offsetFromNowMins
  const hour = Math.floor(totalMins / 60) % 24
  const interval = ferryInterval(hour)
  const next = Math.ceil((totalMins + 1) / interval) * interval
  const h = Math.floor(next / 60) % 24
  const m = next % 60
  const period = h < 12 ? 'AM' : 'PM'
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { time: `${dh}:${m.toString().padStart(2, '0')} ${period}`, interval }
}

export default function FerryCard() {
  const fromGalv = nextDeparture(0)
  // Bolivar departures are offset ~10 min from Galveston (crossing ~18 min)
  const fromBoliv = nextDeparture(10)

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '148px' }}>
      <p style={labelStyle}>Ferry</p>

      <div style={{ fontSize: '28px', marginBottom: '10px' }}>⛴️</div>

      <div style={{ marginBottom: '10px' }}>
        <p style={dirLabel}>← From Galveston</p>
        <p style={timeStyle}>{fromGalv.time}</p>
      </div>

      <div style={{ marginBottom: 'auto' }}>
        <p style={dirLabel}>→ From Bolivar</p>
        <p style={timeStyle}>{fromBoliv.time}</p>
      </div>

      <div style={{
        marginTop: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--color-teal-xlight)',
        borderRadius: 'var(--radius-full)',
        padding: '2px 8px',
        alignSelf: 'flex-start',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--color-teal)', fontWeight: 600 }}>
          ~{fromGalv.interval} min
        </span>
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  marginBottom: '10px',
}

const dirLabel = {
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.4px',
  marginBottom: '2px',
}

const timeStyle = {
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--color-navy)',
}
