import type { MouseEvent } from 'react'
import type { Reservation } from '../lib/reservations'
import { afficherJour, couleurOccupant, debutDeGrille } from '../lib/reservations'

interface Props {
  annee: number
  mois: number
  reservations: Reservation[]
  onClicJour: (jour: Date) => void
  onClicReservation: (reservation: Reservation) => void
}

const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

// Role d'une reservation sur un jour donne :
// arrivee (debute ce jour), depart (finit ce jour) ou sejour (couvre le jour entier).
function roleSurJour(r: Reservation, jour: Date): 'arrivee' | 'depart' | 'sejour' | null {
  const debutJour = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate())
  const finJour = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate() + 1)
  const debutRes = new Date(r.start_ts)
  const finRes = new Date(r.end_ts)
  if (debutRes < finJour && debutJour < finRes) {
    if (debutRes >= debutJour) return 'arrivee'
    if (finRes <= finJour) return 'depart'
    return 'sejour'
  }
  return null
}

// Deux restitutions du meme mois, choisies par la feuille de style :
// grille sept colonnes sur ecran large, liste de reservations sur ecran etroit.
// La bascule est purement CSS, aucune detection d'appareil en JavaScript.
export default function CalendrierMensuel({ annee, mois, reservations, onClicJour, onClicReservation }: Props) {
  const depart = debutDeGrille(annee, mois)
  const cases: Date[] = []
  for (let i = 0; i < 42; i++) {
    cases.push(new Date(depart.getFullYear(), depart.getMonth(), depart.getDate() + i))
  }
  const aujourdhui = new Date()
  const cejour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())

  const debutMois = new Date(annee, mois, 1)
  const finMois = new Date(annee, mois + 1, 1)
  const duMois = reservations.filter(
    (r) => new Date(r.start_ts) < finMois && debutMois < new Date(r.end_ts),
  )

  return (
    <div className="calendrier">
      <div className="cal-desktop">
        <div className="cal-entetes">
          {JOURS.map((j) => (
            <div key={j} className="cal-entete-jour">
              {j}
            </div>
          ))}
        </div>
        <div className="cal-grille">
          {cases.map((jour) => {
            const horsMois = jour.getMonth() !== mois
            const estAujourdhui = jour.getTime() === cejour.getTime()
            const presentes = reservations
              .map((r) => ({ r, role: roleSurJour(r, jour) }))
              .filter((e) => e.role !== null)
            const visibles = presentes.slice(0, 2)
            const reste = presentes.length - visibles.length
            return (
              <div
                key={jour.getTime()}
                className={`cal-jour${horsMois ? ' hors' : ''}${estAujourdhui ? ' aujourdhui' : ''}${ presentes.length > 0 ? ' occupe' : ''}`}
                onClick={() => {
                  if (!horsMois) onClicJour(jour)
                }}
              >
                <span className="cal-num">{jour.getDate()}</span>
                {visibles.map(({ r, role }) => {
                  const c = couleurOccupant(r.occupant)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className="badge-res"
                      style={{ background: c.fond, color: c.texte }}
                      title={`${r.occupant} : ${afficherJour(r.start_ts)} au ${afficherJour(r.end_ts)}`}
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        onClicReservation(r)
                      }}
                    >
                      {role === 'arrivee' ? '⇢ ' : role === 'depart' ? '⇠ ' : ''}
                      {r.occupant}
                    </button>
                  )
                })}
                {reste > 0 && <span className="badge-res badge-plus">+{reste}</span>}
              </div>
            )
          })}
        </div>
      </div>
      <div className="cal-mobile">
        {duMois.length === 0 ? (
          <p className="chrono-vide">Aucune réservation sur ce mois.</p>
        ) : (
          duMois.map((r) => {
            const c = couleurOccupant(r.occupant)
            return (
              <button
                key={r.id}
                type="button"
                className="resa-mobile"
                title={`${afficherJour(r.start_ts)} au ${afficherJour(r.end_ts)}`}
                onClick={() => onClicReservation(r)}
              >
                <span
                  className="pastille"
                  style={{ background: c.fond, borderColor: c.texte }}
                />
                <span className="infos">
                  <span className="nom">{r.occupant}</span>
                  <span className="dates">
                    {afficherJour(r.start_ts)} ⇢ {afficherJour(r.end_ts)}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
