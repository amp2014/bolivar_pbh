import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LayoutProvider, useLayout } from './contexts/LayoutContext'
import { supabase } from './lib/supabase'
import BottomNav from './components/BottomNav'
import SideNav from './components/SideNav'
import ProfileButton from './components/ProfileButton'
import ProtectedRoute from './components/ProtectedRoute'
import OnboardingModal from './components/onboarding/OnboardingModal'
import WhatsNewModal from './components/onboarding/WhatsNewModal'
import AuthCallback from './pages/AuthCallback'
import Login from './pages/Login'
import Home from './pages/Home'
import Stays from './pages/Stays'
import House from './pages/House'
import Local from './pages/Local'
import SupplyCheck from './pages/SupplyCheck'
import Announcements from './pages/Announcements'
import Emergency from './pages/Emergency'
import Admin from './pages/Admin'
import Photos from './pages/Photos'

function AppShell({ children }) {
  const { isDesktop } = useLayout()
  const { profile, user, refreshProfile } = useAuth()
  const [showOnboarding, setShowOnboarding]   = useState(false)
  const [showWhatsNew,   setShowWhatsNew]     = useState(false)
  const [whatsNewData,   setWhatsNewData]     = useState(null)

  // Auto-show onboarding on true first login
  useEffect(() => {
    if (profile?.onboarded === false) setShowOnboarding(true)
  }, [profile?.onboarded])

  // Check What's New once the user is fully onboarded (runs once per login)
  useEffect(() => {
    if (!profile || profile.onboarded === false) return
    supabase.from('whats_new').select('*').eq('id', 1).single().then(({ data }) => {
      if (data && (profile.whats_new_version ?? 0) < data.version) {
        setWhatsNewData(data)
        setShowWhatsNew(true)
      }
    })
  }, [profile?.id, profile?.onboarded])

  async function onOnboardingComplete() {
    await refreshProfile()
    setShowOnboarding(false)
  }

  async function dismissWhatsNew() {
    setShowWhatsNew(false)
    if (user && whatsNewData) {
      await supabase.from('users').update({ whats_new_version: whatsNewData.version }).eq('id', user.id)
    }
  }

  return (
    <div className="app-shell" data-layout={isDesktop ? 'desktop' : 'mobile'}>
      {isDesktop && <SideNav onShowWelcomeGuide={() => setShowOnboarding(true)} />}
      <main className="app-content" id="main-content">
        {children}
        {!isDesktop && <ProfileButton onShowWelcomeGuide={() => setShowOnboarding(true)} />}
      </main>
      <BottomNav />

      {showOnboarding && (
        <OnboardingModal onComplete={onOnboardingComplete} />
      )}
      {!showOnboarding && showWhatsNew && whatsNewData && (
        <WhatsNewModal data={whatsNewData} onDismiss={dismissWhatsNew} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <LayoutProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/supply-check" element={<SupplyCheck />} />
            <Route path="/emergency" element={<Emergency />} />

            {/* Protected shell */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppShell><Home /></AppShell>} />
              <Route path="/stays" element={<AppShell><Stays /></AppShell>} />
              <Route path="/house" element={<AppShell><House /></AppShell>} />
              <Route path="/local" element={<AppShell><Local /></AppShell>} />
              <Route path="/announcements" element={<AppShell><Announcements /></AppShell>} />
              <Route path="/photos" element={<AppShell><Photos /></AppShell>} />
              <Route path="/admin" element={<AppShell><Admin /></AppShell>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </LayoutProvider>
  )
}
