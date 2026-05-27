import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'
import { usePWAInstall } from '../../hooks/usePWAInstall'

const TOTAL_STEPS = 3

export default function OnboardingModal({ onComplete }) {
  const { user, profile } = useAuth()
  const { isDesktop } = useLayout()
  const { isInstalled, isIOS, canPrompt, promptInstall } = usePWAInstall()

  const [visible,     setVisible]     = useState(false)
  const [step,        setStep]        = useState(1)
  const [fadeOut,     setFadeOut]     = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving,      setSaving]      = useState(false)
  const [installed,   setInstalled]   = useState(isInstalled)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function navigate(nextStep) {
    setFadeOut(true)
    setTimeout(() => {
      setStep(nextStep)
      setFadeOut(false)
    }, 180)
  }

  async function handleInstall() {
    const accepted = await promptInstall()
    if (accepted) setInstalled(true)
  }

  async function finish() {
    setSaving(true)
    await supabase
      .from('users')
      .update({
        display_name: displayName.trim() || profile?.display_name,
        onboarded: true,
      })
      .eq('id', user.id)
    await onComplete()
  }

  const avatarUrl = profile?.avatar_url
  const initials  = (profile?.display_name ?? '?')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const progressDots = (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', paddingTop: isDesktop ? '16px' : 'calc(var(--safe-top) + 16px)', paddingBottom: '4px' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? 20 : 6, height: 6, borderRadius: 3,
          background: i + 1 === step ? 'var(--color-navy)' : 'var(--color-sand-200)',
          transition: 'width 0.3s, background 0.3s',
        }} />
      ))}
    </div>
  )

  const stepContent = (
    <div style={{ flex: 1, opacity: fadeOut ? 0 : 1, transition: 'opacity 0.18s', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {step === 1 && <StepWelcome avatarUrl={avatarUrl} initials={initials} profile={profile} />}
      {step === 2 && <StepName displayName={displayName} setDisplayName={setDisplayName} />}
      {step === 3 && <StepInstall isInstalled={installed} isIOS={isIOS} canPrompt={canPrompt} onInstall={handleInstall} />}
    </div>
  )

  const navButtons = (
    <div style={{
      padding: '12px 24px',
      paddingBottom: isDesktop ? '20px' : 'calc(12px + var(--safe-bottom))',
      display: 'flex', gap: '10px',
      borderTop: '1px solid var(--color-border)',
      background: 'white',
    }}>
      {step > 1 && (
        <button onClick={() => navigate(step - 1)} style={{ height: '52px', padding: '0 20px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', color: 'var(--color-text-muted)', fontSize: '15px', fontFamily: 'var(--font-body)', cursor: 'pointer', flexShrink: 0 }}>
          ← Back
        </button>
      )}
      {step < TOTAL_STEPS ? (
        <button onClick={() => navigate(step + 1)} disabled={step === 2 && !displayName.trim()} className="btn btn-primary" style={{ flex: 1, height: '52px', fontSize: '16px', fontWeight: 600 }}>
          Continue →
        </button>
      ) : (
        <button onClick={finish} disabled={saving} className="btn btn-primary" style={{ flex: 1, height: '52px', fontSize: '16px', fontWeight: 600 }}>
          {saving ? 'Setting up…' : "Let's go →"}
        </button>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div style={{
          background: 'var(--color-bg)', borderRadius: '20px',
          width: 'min(500px, calc(100vw - 32px))', maxHeight: '90dvh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.35s, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}>
          {progressDots}
          {stepContent}
          {navButtons}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-bg)',
      zIndex: 300,
      display: 'flex', flexDirection: 'column',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.97)',
      transition: 'opacity 0.35s, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {progressDots}
      {stepContent}
      {navButtons}
    </div>
  )
}

function StepWelcome({ avatarUrl, initials, profile }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 28px 24px',
      textAlign: 'center',
    }}>
      {/* App icon */}
      <div style={{
        width: 88, height: 88, borderRadius: 22,
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 60%, #1a5c6e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '28px',
        boxShadow: '0 12px 32px rgba(26,58,92,0.30)',
      }}>
        <svg width="48" height="30" viewBox="0 0 48 30">
          <path d="M2 20 Q14 6 24 14 Q34 22 46 8" stroke="#2ab8c4" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M6 26 Q18 14 28 20 Q36 24 42 16" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: '30px',
        fontWeight: 700, color: 'var(--color-navy)',
        lineHeight: 1.2, marginBottom: '10px',
      }}>
        Welcome to the<br />Beach House
      </h1>

      <p style={{
        fontSize: '13px', fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)', letterSpacing: '0.5px',
        marginBottom: '20px',
      }}>
        604 NELSON AVE · BOLIVAR, TX
      </p>

      <p style={{
        fontSize: '15px', color: 'var(--color-text-muted)',
        lineHeight: 1.6, maxWidth: '300px',
      }}>
        Your family's hub for everything at the house — stays, supplies, local favorites, and more.
      </p>

      {/* User preview */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginTop: '32px', padding: '12px 16px',
        background: 'var(--color-sand-50)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
          background: 'var(--color-teal-xlight)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-navy)' }}>{initials}</span>
          }
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>
            {profile?.display_name ?? 'You'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Signed in with Google
          </p>
        </div>
      </div>
    </div>
  )
}

function StepName({ displayName, setDisplayName }) {
  return (
    <div style={{ padding: '40px 28px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--color-teal-xlight)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px', fontSize: '26px',
        }}>
          👤
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '26px',
          fontWeight: 700, color: 'var(--color-navy)',
          marginBottom: '8px', lineHeight: 1.2,
        }}>
          What should we<br />call you?
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          This is how your name appears to other family members.
        </p>
      </div>

      <label style={{
        display: 'block', fontSize: '12px', fontWeight: 600,
        color: 'var(--color-text-muted)', letterSpacing: '0.4px',
        textTransform: 'uppercase', marginBottom: '8px',
        fontFamily: 'var(--font-body)',
      }}>
        Display Name
      </label>
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        autoFocus
        placeholder="Your name"
        style={{
          width: '100%', height: '52px', padding: '0 16px',
          borderRadius: 'var(--radius-md)',
          border: '2px solid var(--color-teal)',
          background: 'white', fontFamily: 'var(--font-body)',
          fontSize: '18px', color: 'var(--color-navy)',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function StepInstall({ isInstalled, isIOS, canPrompt, onInstall }) {
  const [installing, setInstalling] = useState(false)

  async function handleTap() {
    setInstalling(true)
    await onInstall()
    setInstalling(false)
  }

  if (isInstalled) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 28px', textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--color-teal-xlight)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px', fontSize: '32px',
        }}>
          ✅
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '8px' }}>
          App installed!
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          You're all set. The app is already on your home screen.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 28px 24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--color-navy)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px', fontSize: '26px',
        }}>
          📲
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '26px',
          fontWeight: 700, color: 'var(--color-navy)',
          marginBottom: '8px', lineHeight: 1.2,
        }}>
          Add to Home Screen
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Install the app for a faster, full-screen experience — no browser bar.
        </p>
      </div>

      {canPrompt && (
        <button
          onClick={handleTap}
          disabled={installing}
          className="btn btn-primary"
          style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}
        >
          {installing ? 'Installing…' : '+ Install App'}
        </button>
      )}

      {isIOS && !canPrompt && (
        <div style={{
          background: 'var(--color-sand-50)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>
            To install on iPhone / iPad:
          </p>
          {[
            { icon: '⬆️', text: 'Tap the Share button in Safari' },
            { icon: '📋', text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: '✅', text: 'Tap "Add" to confirm' },
          ].map(({ icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 2 ? '10px' : 0 }}>
              <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
              <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>{text}</p>
            </div>
          ))}
        </div>
      )}

      {!canPrompt && !isIOS && (
        <div style={{
          padding: '16px', background: 'var(--color-sand-50)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
            You can install this app later from your browser's menu → "Install app" or "Add to Home Screen".
          </p>
        </div>
      )}
    </div>
  )
}
