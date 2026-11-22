import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import CalendrierMensuel from '../components/CalendrierMensuel'
import Chronologie from '../components/Chronologie'
import ReservationForm, { type ChampsReservation } from '../components/ReservationForm'
import type { Profil, Reservation } from '../lib/reservations'
import {
  afficherJour,
  afficherLongue,
  chargerProfils,
  chargerReservations,
  chevauche,
  creerReservation,
  modifierReservation,
  supprimerReservation,
  titreMois,
} from '../lib/reservations'

interface EtatFormulaire {
  mode: 'creation' | 'edition'
  reservation?: Reservation
  initial: ChampsReservation
}

export default function Planning() {
  const { session } = useAuth()
  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [profils, setProfils] = useState<Profil[]>([])
  const [vue, setVue] = useState<'calendrier' | 'chronologie'>('calendrier')
  const maintenant = new Date()
  const [annee, setAnnee] = useState(maintenant.getFullYear())
  const [mois, setMois] = useState(maintenant.getMonth())
  const [formulaire, setFormulaire] = useState<EtatFormulaire | null>(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [enCours, setEnCours] = useState(false)

  const utilisateur = session?.user.id ?? ''

  const recharger = useCallback(async () => {
    try {
      const [res, pro] = await Promise.all([chargerReservations(), chargerProfils()])
      setReservations(res)
      setProfils(pro)
      return true
    } catch {
      setErreur('Impossible de charger les réservations. Recharge la page et réessaie.')
      return false
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  const nomParDefaut = useMemo(() => {
    const p = profils.find((x) => x.id === utilisateur)
    if (p) return p.display_name
    const courriel = session?.user.email ?? ''
    return courriel.split('@')[0]
  }, [profils, utilisateur, session])

  const suggestions = useMemo(() => {
    const noms = new Set(profils.map((p) => p.display_name))
    reservations?.forEach((r) => noms.add(r.occupant))
    return Array.from(noms).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [profils, reservations])

  const changerMois = (delta: number) => {
    const cible = new Date(annee, mois + delta, 1)
    setAnnee(cible.getFullYear())
    setMois(cible.getMonth())
    setFormulaire(null)
    setErreur('')
    setInfo('')
  }

  const allerAujourdhui = () => {
    const auj = new Date()
    setAnnee(auj.getFullYear())
    setMois(auj.getMonth())
    setFormulaire(null)
    setErreur('')
    setInfo('')
  }

  // Un clic sur un jour du calendrier pre-remplit une nuit a partir de midi.
  const creerPourJour = (jour: Date) => {
    if (!session) return
    setErreur('')
    setInfo('')
    setFormulaire({
      mode: 'creation',
      initial: {
        occupant: nomParDefaut,
        debut: new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), 12),
        fin: new Date(jour.getFullYear(), jour.getMonth(), jour.getDate() + 1, 12),
        comment: '',
      },
    })
  }

  const boutonNouvelle = () => {
    const auj = new Date()
    if (auj.getFullYear() === annee && auj.getMonth() === mois) {
      creerPourJour(auj)
    } else {
      creerPourJour(new Date(annee, mois, 1))
    }
  }

  const ouvrir = (r: Reservation) => {
    setErreur('')
    setInfo('')
    setFormulaire({
      mode: 'edition',
      reservation: r,
      initial: {
        occupant: r.occupant,
        debut: new Date(r.start_ts),
        fin: new Date(r.end_ts),
        comment: r.comment ?? '',
      },
    })
  }

  const metaReservation = (r: Reservation): string => {
    const auteur = profils.find((p) => p.id === r.user_id)?.display_name ?? 'un membre'
    const modifieur = r.updated_by ? profils.find((p) => p.id === r.updated_by)?.display_name ?? 'un membre' : null
    const creee = `Créée par ${auteur} le ${afficherLongue(r.created_at)}`
    if (modifieur) return `${creee} · modifiée par ${modifieur} le ${afficherLongue(r.updated_at)}`
    return creee
  }

  // Restitution des erreurs PostgreSQL : la contrainte d'exclusion (23P01) et
  // le controle de coherence des dates (23514) disent pourquoi l'ecriture est refusee.
  const messageErreur = (e: unknown, champs: ChampsReservation): string => {
    const code = (e as { code?: string })?.code ?? ''
    if (code === '23P01') {
      const conflit = (reservations ?? []).find((r) =>
        chevauche(champs.debut, champs.fin, new Date(r.start_ts), new Date(r.end_ts)),
      )
      if (conflit) {
        return `Chevauchement avec la réservation de ${conflit.occupant} : ${afficherJour(conflit.start_ts)} au ${afficherJour(conflit.end_ts)}. Deux séjours peuvent se toucher à midi, pas se chevaucher.`
      }
      return 'Chevauchement avec une réservation existante.'
    }
    if (code === '23514') {
      return 'Le départ doit être postérieur à l’arrivée.'
    }
    return 'Enregistrement impossible pour le moment. Réessaie dans un instant.'
  }

  const valider = async (champs: ChampsReservation) => {
    setErreur('')
    setInfo('')
    if (champs.occupant === '') {
      setErreur('L’occupant est obligatoire.')
      return
    }
    if (champs.fin.getTime() <= champs.debut.getTime()) {
      setErreur('Le départ doit être postérieur à l’arrivée.')
      return
    }
    setEnCours(true)
    const payload = {
      occupant: champs.occupant,
      start_ts: champs.debut.toISOString(),
      end_ts: champs.fin.toISOString(),
      comment: champs.comment === '' ? null : champs.comment,
    }
    try {
      if (formulaire?.mode === 'edition' && formulaire.reservation) {
        await modifierReservation(formulaire.reservation.id, payload, utilisateur)
      } else {
        await creerReservation({ ...payload, user_id: utilisateur })
      }
      setFormulaire(null)
      setInfo('Réservation enregistrée.')
      await recharger()
    } catch (e) {
      setErreur(messageErreur(e, champs))
    }
    setEnCours(false)
  }

  // La confirmation de suppression se fait dans le formulaire (bloc rouge),
  // sans fenetre native du navigateur.
  const supprimer = async () => {
    if (!formulaire?.reservation) return
    setEnCours(true)
    setErreur('')
    try {
      await supprimerReservation(formulaire.reservation.id)
      setFormulaire(null)
      setInfo('Réservation supprimée.')
      await recharger()
    } catch {
      setErreur('Suppression impossible pour le moment. Réessaie dans un instant.')
    }
    setEnCours(false)
  }

  if (!session) return null

  return (
    <section className="module">
      <div className="planning-tete">
        <h2>Planning des réservations</h2>
        <button className="btn principal" type="button" onClick={boutonNouvelle}>
          Nouvelle réservation
        </button>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}
      {info && <p className="info">{info}</p>}

      {formulaire && (
        <ReservationForm
          key={formulaire.mode === 'edition' ? (formulaire.reservation?.id ?? 'edition') : 'creation'}
          initial={formulaire.initial}
          suggestions={suggestions}
          enEdition={formulaire.mode === 'edition'}
          meta={formulaire.reservation ? metaReservation(formulaire.reservation) : undefined}
          enCours={enCours}
          onValide={valider}
          onSupprime={formulaire.mode === 'edition' ? supprimer : undefined}
          onAnnule={() => setFormulaire(null)}
        />
      )}

      <div className="planning-outils">
        <div className="planning-nav">
          <button className="btn fantome" type="button" onClick={() => changerMois(-1)} aria-label="Mois précédent">
            ◀
          </button>
          <span className="planning-mois">{titreMois(annee, mois)}</span>
          <button className="btn fantome" type="button" onClick={() => changerMois(1)} aria-label="Mois suivant">
            ▶
          </button>
          <button className="btn fantome" type="button" onClick={allerAujourdhui}>
            Aujourd’hui
          </button>
        </div>
        <div className="segment">
          <button
            type="button"
            className={vue === 'calendrier' ? 'actif' : ''}
            onClick={() => setVue('calendrier')}
          >
            Calendrier
          </button>
          <button
            type="button"
            className={vue === 'chronologie' ? 'actif' : ''}
            onClick={() => setVue('chronologie')}
          >
            Chronologie
          </button>
        </div>
      </div>

      {reservations === null ? (
        <p className="a-venir">Chargement du planning…</p>
      ) : vue === 'calendrier' ? (
        <CalendrierMensuel
          annee={annee}
          mois={mois}
          reservations={reservations}
          onClicJour={creerPourJour}
          onClicReservation={ouvrir}
        />
      ) : (
        <Chronologie annee={annee} mois={mois} reservations={reservations} onClicReservation={ouvrir} />
      )}

      <p className="planning-aide">
        Clique sur un jour du calendrier pour y préremplir une réservation, ou sur un nom pour
        consulter et modifier une réservation existante. Deux séjours peuvent se suivre à midi.
      </p>
    </section>
  )
}
