import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState<'courriel' | 'code'>('courriel')
  const [courriel, setCourriel] = useState('')
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [info, setInfo] = useState('')

  const demanderCode = async (e: FormEvent) => {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: courriel.trim(),
      options: { shouldCreateUser: false },
    })
    setEnCours(false)
    if (error) {
      setErreur('Envoi impossible pour cette adresse. Vérifie qu’elle a bien été invitée par un administrateur.')
      return
    }
    setInfo('Un code à six chiffres vient d’être envoyé à ton adresse. Il expire dans une heure.')
    setEtape('code')
  }

  const verifierCode = async (e: FormEvent) => {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const { error } = await supabase.auth.verifyOtp({
      email: courriel.trim(),
      token: code.trim(),
      type: 'email',
    })
    setEnCours(false)
    if (error) {
      setErreur('Code incorrect ou expiré. Tu peux en demander un nouveau.')
      return
    }
    navigate('/', { replace: true })
  }

  const retourCourriel = () => {
    setEtape('courriel')
    setCode('')
    setInfo('')
    setErreur('')
  }

  return (
    <main className="connexion">
      <div className="carte-connexion">
        <svg className="logo-grand" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
        </svg>
        <h1>Appartement familial</h1>
        <p className="sous-titre">Réservé aux membres de la famille</p>

        {etape === 'courriel' && (
          <form onSubmit={demanderCode}>
            <label htmlFor="courriel">Adresse électronique</label>
            <input
              id="courriel"
              type="email"
              required
              autoComplete="email"
              placeholder="prenom.nom@exemple.fr"
              value={courriel}
              onChange={(e) => setCourriel(e.target.value)}
            />
            <button className="btn principal" type="submit" disabled={enCours}>
              {enCours ? 'Envoi en cours…' : 'Recevoir un code'}
            </button>
          </form>
        )}

        {etape === 'code' && (
          <form onSubmit={verifierCode}>
            <label htmlFor="code">Code à six chiffres reçu par courriel</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              className="saisie-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn principal" type="submit" disabled={enCours}>
              {enCours ? 'Vérification…' : 'Valider'}
            </button>
            <button className="btn lien" type="button" onClick={retourCourriel}>
              Changer d'adresse ou renvoyer un code
            </button>
          </form>
        )}

        {info && <p className="info">{info}</p>}
        {erreur && <p className="erreur">{erreur}</p>}
      </div>
    </main>
  )
}
