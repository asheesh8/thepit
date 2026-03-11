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
import Navbar from './components/Navbar'

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
      {session && <Navbar session={session} />}
      <Routes>
        <Route path="/" element={session ? <Navigate to="/feed" /> : <Landing />} />
        <Route path="/auth" element={session ? <Navigate to="/feed" /> : <Auth />} />
        <Route path="/feed" element={session ? <Feed session={session} /> : <Navigate to="/" />} />
        <Route path="/journal" element={session ? <Journal session={session} /> : <Navigate to="/" />} />
        <Route path="/new" element={session ? <NewEntry session={session} /> : <Navigate to="/" />} />
        <Route path="/search" element={session ? <Search session={session} /> : <Navigate to="/" />} />
        <Route path="/connections" element={session ? <Connections session={session} /> : <Navigate to="/" />} />
        <Route path="/profile/:username" element={session ? <Profile session={session} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
