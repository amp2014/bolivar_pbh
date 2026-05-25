import { useWeather } from '../../hooks/useWeather'

const shimmer = {
  background: 'var(--color-sand-100)',
  borderRadius: '6px',
  animation: 'none',
}

export default function WeatherCard() {
  const { weather, loading } = useWeather()

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '148px' }}>
      <p style={labelStyle}>Weather</p>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
          <div style={{ ...shimmer, height: '36px', width: '48px' }} />
          <div style={{ ...shimmer, height: '20px', width: '56px' }} />
          <div style={{ ...shimmer, height: '14px', width: '80px' }} />
        </div>
      ) : !weather ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
          Unavailable
        </p>
      ) : (
        <>
          <div style={{ fontSize: '34px', lineHeight: 1, marginBottom: '4px' }}>
            {weather.emoji}
          </div>
          <div style={{
            fontSize: '30px',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-navy)',
            lineHeight: 1,
            marginBottom: '4px',
          }}>
            {weather.temp}°
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
            {weather.label}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={metaStyle}>Feels {weather.feelsLike}°</span>
            <span style={metaStyle}>💨 {weather.wind} mph</span>
          </div>
        </>
      )}
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

const metaStyle = {
  fontSize: '11px',
  color: 'var(--color-text-muted)',
}
