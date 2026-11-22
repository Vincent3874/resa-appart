import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { session } = useAuth()
  const navigate = useNavigate()
  // L'onglet Comptabilité n'est affiché qu'aux administrateurs (profiles.is_admin) ;
  // la RLS via resa.est_admin() reste le contrôle réel côté serveur.
  const [estAdmin, setEstAdmin] = useState(false)

  useEffect(() => {
    if (!session) {
      setEstAdmin(false)
      return
    }
    let actif = true
    const charger = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
        if (actif && !error) setEstAdmin(data?.is_admin ?? false)
      } catch {
        // Profil illisible : l'onglet reste masqué, la RLS tranchera côté serveur.
      }
    }
    charger()
    return () => {
      actif = false
    }
  }, [session])

  const deconnexion = async () => {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  const courant = session?.user.email ?? ''

  return (
    <div className="page">
      <header className="bandeau">
        <div className="bandeau-titre">
          <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
          </svg>
          <span>Appartement Bormes</span>
        </div>
        <nav className="menu">
          <NavLink to="/" end>
            Planning
          </NavLink>
          <NavLink to="/notes">Notes</NavLink>
          {estAdmin && <NavLink to="/comptabilite">Comptabilité</NavLink>}
        </nav>
        <div className="bandeau-profil">
          <span className="courriel" title={courant}>
            {courant}
          </span>
          <button className="btn discret" onClick={deconnexion}>
            Déconnexion
          </button>
        </div>
      </header>
      <main className="contenu">
        <Outlet />
      </main>
      <footer className="pied">Réservations de l'appartement Bormes</footer>
    </div>
  )
}
