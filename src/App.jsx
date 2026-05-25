import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
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

export default function App() {
  return (
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
            <Route path="/" element={<><Home /><BottomNav /></>} />
            <Route path="/stays" element={<><Stays /><BottomNav /></>} />
            <Route path="/house" element={<><House /><BottomNav /></>} />
            <Route path="/local" element={<><Local /><BottomNav /></>} />
            <Route path="/announcements" element={<><Announcements /><BottomNav /></>} />
            <Route path="/admin" element={<><Admin /><BottomNav /></>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
