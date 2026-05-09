import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Feed from './pages/Feed'
import Journal from './pages/Journal'
import NewEntry from './pages/NewEntry'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import Search from './pages/Search'
import Connections from './pages/Connections'
import Strategies from './pages/Strategies'
import StrategyDetail from './pages/StrategyDetail'
import Backtesting from './pages/Backtesting'
import Calendar from './pages/Calendar'
import Review from './pages/Review'
import Rooms from './pages/Rooms'
import LiveRoom from './pages/LiveRoom'
import AccountSettings from './pages/AccountSettings'
import Vault from './pages/Vault'
import Navbar from './components/Navbar'
import DailyCheckInGate from './components/DailyCheckInGate'
import GuestFeed from './pages/GuestFeed'
import NewFeaturesModal from './components/NewFeaturesModal'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <span style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.2em', color: '#e63946' }}>THE PIT</span>
    </div>
  )

  return (
    <BrowserRouter>
      {session ? (
        <DailyCheckInGate session={session}>
          <Navbar session={session} />
          <NewFeaturesModal />
          <Routes>
            <Route path="/" element={<Navigate to="/feed" />} />
            <Route path="/auth" element={<Navigate to="/feed" />} />
            <Route path="/feed" element={<Feed session={session} />} />
            <Route path="/journal" element={<Journal session={session} />} />
            <Route path="/new" element={<NewEntry session={session} />} />
            <Route path="/search" element={<Search session={session} />} />
            <Route path="/connections" element={<Connections session={session} />} />
            <Route path="/strategies" element={<Strategies session={session} />} />
            <Route path="/strategies/:id" element={<StrategyDetail session={session} />} />
            <Route path="/backtesting" element={<Backtesting session={session} />} />
            <Route path="/calendar" element={<Calendar session={session} />} />
            <Route path="/review" element={<Review session={session} />} />
            <Route path="/rooms" element={<Rooms session={session} />} />
            <Route path="/rooms/:id" element={<LiveRoom session={session} />} />
            <Route path="/settings" element={<AccountSettings session={session} />} />
            <Route path="/vault" element={<Vault session={session} />} />
            <Route path="/profile/:username" element={<Profile session={session} />} />
          </Routes>
        </DailyCheckInGate>
      ) : (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<GuestFeed />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}
