import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import HouseInfoList from '../components/house/HouseInfoList'
import SupplyList from '../components/supplies/SupplyList'
import QRGenerator from '../components/supplies/QRGenerator'
import InventoryList from '../components/inventory/InventoryList'
import ProjectList from '../components/projects/ProjectList'

export default function House() {
  const { isAdmin } = useAuth()
  const [section, setSection] = useState('Info')

  const tabs = isAdmin
    ? ['Info', 'Supplies', 'Inventory', 'Projects', 'QR Codes']
    : ['Info', 'Supplies', 'Inventory', 'Projects']

  return (
    <main className="page" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
        padding: 'calc(var(--safe-top) + 28px) 20px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg viewBox="0 0 375 60" preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px', opacity: 0.10 }}>
          <path d="M0 30 Q94 0 188 30 Q282 60 375 30 L375 60 L0 60 Z" fill="white" />
        </svg>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '3px', position: 'relative' }}>
          604 Nelson Ave
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '28px', fontWeight: 700, lineHeight: 1.15, position: 'relative' }}>
          The House
        </h1>
      </div>

      <div className="page-inner" style={{ paddingTop: '16px' }}>

        {/* Scrollable tab bar */}
        <div style={{
          display: 'flex', gap: '6px',
          overflowX: 'auto', marginBottom: '16px',
          paddingBottom: '2px', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setSection(t)}
              style={{
                height: '36px', padding: '0 16px',
                borderRadius: 'var(--radius-full)', border: 'none',
                background: section === t ? 'var(--color-navy)' : 'var(--color-sand-100)',
                color: section === t ? 'white' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                fontWeight: section === t ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {section === 'Info'      && <HouseInfoList />}
        {section === 'Supplies'  && <SupplyList />}
        {section === 'Inventory' && <InventoryList />}
        {section === 'Projects'  && <ProjectList />}
        {section === 'QR Codes'  && isAdmin && <QRGenerator />}

      </div>
    </main>
  )
}
