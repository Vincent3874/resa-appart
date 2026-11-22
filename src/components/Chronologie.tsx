import type { Reservation } from '../lib/reservations'
import { afficherJour, couleurOccupant, debutDeGrille } from '../lib/reservations'

interface Props {
  annee: number
  mois: number
  reservations: Reservation[]
  onClicReservation: (reservation: Reservation) => void
}

// Vue chronologie : barre par reservation sur six semaines alignees sur le mois.
// L'echelle temporelle est continue (millisecondes) : une fin a midi arrete la
// barre au milieu du jour de depart, sans calcul special.
export default function Chronologie({ annee, mois, reservations, onClicReservation }: Props) {
  const depart = debutDeGrille(annee, mois)
  const fin = new Date(depart.getFullYear(), depart.getMonth(), depart.getDate() + 42)
  const duree = fin.getTime() - depart.getTime()
  const cellules = Array.from({ length: 42 }, (_, i) => new Date(depart.getFullYear(), depart.getMonth(), depart.getDate() + i))
  const presentes = reservations.filter(
    (r) => new Date(r.start_ts) < fin && depart < new Date(r.end_ts),
  )

  const enPourcent = (valeur: Date): number => {
    const t = Math.min(Math.max(valeur.getTime(), depart.getTime()), fin.getTime())
    return ((t - depart.getTime()) / duree) * 100
  }

  return (
    <div className="chrono">
      <div className="chrono-corps">
        <div className="chrono-jours">
          {cellules.map((j) => (
            <div key={j.getTime()} className={`chrono-jour${j.getDay() === 0 || j.getDay() === 6 ? ' we' : ''}`}>
              {j.getDate()}
            </div>
          ))}
        </div>
        {presentes.length === 0 ? (
          <p className="chrono-vide">Aucune réservation ne couvre cette période.</p>
        ) : (
          presentes.map((r) => {
            const debutRes = new Date(r.start_ts)
            const finRes = new Date(r.end_ts)
            const gauche = enPourcent(debutRes)
            const droite = Math.max(enPourcent(finRes), gauche + 0.7)
            const c = couleurOccupant(r.occupant)
            return (
              <div key={r.id} className="chrono-ligne">
                <button
                  type="button"
                  className="chrono-barre"
                  style={{
                    left: `${gauche}%`,
                    width: `${droite - gauche}%`,
                    background: c.fond,
                    color: c.texte,
                    borderColor: c.texte,
                  }}
                  title={`${r.occupant} : ${afficherJour(debutRes)} au ${afficherJour(finRes)}`}
                  onClick={() => onClicReservation(r)}
                >
                  {r.occupant}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
