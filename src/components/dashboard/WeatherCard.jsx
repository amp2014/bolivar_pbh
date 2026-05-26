import { useWeather } from '../../hooks/useWeather'

const WEATHER_URL = 'https://weather.com/weather/today/l/Bolivar%2BPeninsula%2BTexas%2B77650?canonicalCityId=57aebbbc79a3276959c0e98c30cb6b36'

const shimmer = {
  background: 'var(--color-sand-100)',
  borderRadius: '6px',
  animation: 'none',
}

export default function WeatherCard() {
  const { weather, loading, refetch } = useWeather()

  return (
    <a
      href={WEATHER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="card"
      style={{
        display: 'flex', flexDirection: 'column', minHeight: '148px',
        textDecoration: 'none', color: 'inherit', cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={labelStyle}>Weather</p>
        <span style={{ fontSize: '11px', color: 'var(--color-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>forecast ›</span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
          <div style={{ ...shimmer, height: '36px', width: '48px' }} />
          <div style={{ ...shimmer, height: '20px', width: '56px' }} />
          <div style={{ ...shimmer, height: '14px', width: '80px' }} />
        </div>
      ) : !weather ? (
        <div style={{ marginTop: '8px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
            Unavailable
          </p>
          <button
            onClick={(e) => { e.preventDefault(); refetch() }}
            style={{
              fontSize: '11px', color: 'var(--color-teal)', fontWeight: 600,
              border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-full)',
              background: 'transparent', padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Retry
          </button>
        </div>
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
    </a>
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
