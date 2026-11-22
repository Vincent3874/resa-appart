import { useState, type FormEvent } from 'react'
import { depuisInputs, versInputDate, versInputHeure } from '../lib/reservations'

export interface ChampsReservation {
  occupant: string
  debut: Date
  fin: Date
  comment: string
}

interface Props {
  initial: ChampsReservation
  suggestions: string[]
  enEdition: boolean
  meta?: string
  enCours: boolean
  onValide: (champs: ChampsReservation) => Promise<void>
  onSupprime?: () => void
  onAnnule: () => void
}

// Formulaire unique de creation et de modification.
// Les heures sont masquees a midi par defaut, reglable finement via le bloc depliant.
export default function ReservationForm({
  initial,
  suggestions,
  enEdition,
  meta,
  enCours,
  onValide,
  onSupprime,
  onAnnule,
}: Props) {
  const [occupant, setOccupant] = useState(initial.occupant)
  const [dateDebut, setDateDebut] = useState(versInputDate(initial.debut))
  const [heureDebut, setHeureDebut] = useState(versInputHeure(initial.debut))
  const [dateFin, setDateFin] = useState(versInputDate(initial.fin))
  const [heureFin, setHeureFin] = useState(versInputHeure(initial.fin))
  const [comment, setComment] = useState(initial.comment)

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    onValide({
      occupant: occupant.trim(),
      debut: depuisInputs(dateDebut, heureDebut),
      fin: depuisInputs(dateFin, heureFin),
      comment: comment.trim(),
    })
  }

  return (
    <div className="formulaire-res">
      <h3>{enEdition ? 'Modifier la réservation' : 'Nouvelle réservation'}</h3>
      {meta && <p className="meta-res">{meta}</p>}
      <form onSubmit={envoyer}>
        <div className="champ">
          <label htmlFor="occupant">Occupant</label>
          <input
            id="occupant"
            list="occupants-connus"
            required
            value={occupant}
            onChange={(e) => setOccupant(e.target.value)}
            placeholder="Nom de la personne hébergée"
          />
          <datalist id="occupants-connus">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="champ-ligne">
          <div className="champ">
            <label htmlFor="date-debut">Jour d'arrivée</label>
            <input
              id="date-debut"
              type="date"
              required
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div className="champ">
            <label htmlFor="date-fin">Jour de départ</label>
            <input
              id="date-fin"
              type="date"
              required
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
        </div>
        <details className="reglage-heures">
          <summary>Réglage précis des heures (midi par défaut)</summary>
          <div className="champ-ligne">
            <div className="champ">
              <label htmlFor="heure-debut">Heure d'arrivée</label>
              <input
                id="heure-debut"
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
              />
            </div>
            <div className="champ">
              <label htmlFor="heure-fin">Heure de départ</label>
              <input
                id="heure-fin"
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
              />
            </div>
          </div>
        </details>
        <div className="champ">
          <label htmlFor="comment-res">Commentaire (facultatif)</label>
          <textarea
            id="comment-res"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Précisions utiles aux autres membres"
          />
        </div>
        <div className="form-actions">
          <button className="btn principal" type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : enEdition ? 'Enregistrer les modifications' : 'Réserver'}
          </button>
          {enEdition && onSupprime && (
            <button className="btn danger" type="button" disabled={enCours} onClick={onSupprime}>
              Supprimer
            </button>
          )}
          <button className="btn lien" type="button" onClick={onAnnule}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
