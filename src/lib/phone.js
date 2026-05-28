// Format as user types — returns (###) ###-#### progressively
export function maskPhone(raw) {
  const d = (raw ?? '').replace(/\D/g, '').slice(0, 10)
  if (d.length === 0) return ''
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// Format stored value for display — tolerates raw digits or already-formatted strings
export function formatPhone(value) {
  if (!value) return ''
  const d = value.replace(/\D/g, '')
  if (d.length !== 10) return value
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// Strip to raw 10 digits — use for tel: hrefs and DB storage
export function rawPhone(value) {
  return (value ?? '').replace(/\D/g, '').slice(0, 10)
}
