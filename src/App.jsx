import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LayoutProvider, useLayout } from './contexts/LayoutContext'
import BottomNav from './components/BottomNav'
import SideNav from './components/SideNav'
import ProfileButton from './components/ProfileButton'
import ProtectedRoute from './components/ProtectedRoute'
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
  return (
    <div className="app-shell" data-layout={isDesktop ? 'desktop' : 'mobile'}>
      {isDesktop && <SideNav />}
      <main className="app-content" id="main-content">
        {children}
        {!isDesktop && <ProfileButton />}
      </main>
      <BottomNav />
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
