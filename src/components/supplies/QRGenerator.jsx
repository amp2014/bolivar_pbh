import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function QRGenerator() {
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('global')
  const [qrUrl, setQrUrl] = useState('')
  const canvasRef = useRef(null)

  useEffect(() => {
    supabase.from('supplies').select('id, name, category').order('category').order('name')
      .then(({ data }) => { setSupplies(data ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    const base = window.location.origin
    const url = selected === 'global'
      ? `${base}/supply-check`
      : `${base}/supply-check?item=${selected}`
    setQrUrl(url)
  }, [selected])

  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
        QR Code Generator
      </p>

      {/* Picker */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Select QR target</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={selectStyle}
        >
          <option value="global">All Supplies (global check-in)</option>
          {!loading && supplies.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
          ))}
        </select>
      </div>

      {/* QR preview via Google Charts API */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '16px' }}>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
          alt="QR Code"
          style={{ width: 200, height: 200, imageRendering: 'pixelated' }}
        />
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', textAlign: 'center' }}>
          {qrUrl}
        </p>
        <a
          href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&format=png`}
          download="supply-qr.png"
          className="btn btn-outline"
          style={{ fontSize: '14px', padding: '10px 24px' }}
        >
          Download QR
        </a>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.4px',
  textTransform: 'uppercase',
  marginBottom: '6px',
  fontFamily: 'var(--font-body)',
}

const selectStyle = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-sand-50)',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  color: 'var(--color-text)',
  outline: 'none',
  boxSizing: 'border-box',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: '36px',
}
