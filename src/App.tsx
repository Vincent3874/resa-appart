import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Planning from './pages/Planning'
import Notes from './pages/Notes'
import Comptabilite from './pages/Comptabilite'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <main className="centre">Chargement…</main>
  if (!session) return <Navigate to="/connexion" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Planning />} />
        <Route path="notes" element={<Notes />} />
        <Route path="comptabilite" element={<Comptabilite />} />
      </Route>
    </Routes>
  )
}
