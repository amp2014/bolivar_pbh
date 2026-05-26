import { useEffect, useState, useCallback } from 'react'

const LAT = 29.453
const LON = -94.534
const CACHE_KEY = 'pbh_weather_v1'
const CACHE_TTL = 30 * 60 * 1000 // 30 min

export function wmoInterpret(code) {
  if (code === 0)  return { label: 'Clear', emoji: '☀️' }
  if (code <= 2)   return { label: 'Partly cloudy', emoji: '⛅' }
  if (code === 3)  return { label: 'Overcast', emoji: '☁️' }
  if (code <= 48)  return { label: 'Foggy', emoji: '🌫️' }
  if (code <= 55)  return { label: 'Drizzle', emoji: '🌦️' }
  if (code <= 65)  return { label: 'Rain', emoji: '🌧️' }
  if (code <= 75)  return { label: 'Snow', emoji: '❄️' }
  if (code <= 82)  return { label: 'Showers', emoji: '🌦️' }
  return { label: 'Thunderstorm', emoji: '⛈️' }
}

export function useWeather() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const refetch = useCallback(() => {
    try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
    setError(null)
    setLoading(true)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setWeather(cached.data)
        setLoading(false)
        return
      }
    } catch { /* ignore bad cache */ }

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,apparent_temperature,weather_code,windspeed_10m` +
      `&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FChicago`

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => {
        if (cancelled) return
        const c = json.current
        const result = {
          temp: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          wind: Math.round(c.windspeed_10m),
          ...wmoInterpret(c.weather_code ?? c.weathercode),
        }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result })) } catch { /* quota */ }
        setWeather(result)
      })
      .catch((e) => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  return { weather, loading, error, refetch }
}
