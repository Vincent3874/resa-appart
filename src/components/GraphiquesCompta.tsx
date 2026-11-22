import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { afficherMontant, type PosteAnnee, type SoldeAnnuel } from '../lib/comptabilite'

interface Props {
  soldes: SoldeAnnuel[]
  postes: PosteAnnee[]
  annees: number[]
  anneePoste: number
  onChangeAnnee: (annee: number) => void
}

// Teintes reprises des variables de index.css (--vert-fonce, --rouge) :
// recharts accepte les couleurs littérales dans les attributs SVG.
const VERT = '#2f6b4f'
const ROUGE = '#b3402f'

const formatEuros = (v: number) => afficherMontant(v)

// Visualisations du jalon J5, en appui sur les vues SQL resa.v_compta_solde_annuel
// (évolution temporelle) et resa.v_compta_poste_annee (répartition par poste).
export default function GraphiquesCompta({ soldes, postes, annees, anneePoste, onChangeAnnee }: Props) {
  const donneesSoldes = soldes
    .map((s) => ({
      annee: String(Number(s.annee)),
      recettes: Number(s.recettes ?? 0),
      depenses: Number(s.depenses ?? 0),
      solde: Number(s.solde ?? 0),
    }))
    .sort((a, b) => a.annee.localeCompare(b.annee))

  const donneesPostes = postes
    .filter((p) => Number(p.annee) === anneePoste)
    .map((p) => ({ poste: p.poste, total: Number(p.total), direction: p.direction }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="graphiques-compta">
      <div className="carte-graphique">
        <h3>Recettes, dépenses et solde par année</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={donneesSoldes} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9e2dc" />
            <XAxis dataKey="annee" tick={{ fontSize: 12, fill: '#5c6b63' }} />
            <YAxis tick={{ fontSize: 12, fill: '#5c6b63' }} tickFormatter={(v: number) => `${v} €`} width={70} />
            <Tooltip formatter={(value) => formatEuros(Number(value))} />
            <Legend />
            <Bar dataKey="recettes" name="Recettes" fill={VERT} radius={[4, 4, 0, 0]} />
            <Bar dataKey="depenses" name="Dépenses" fill={ROUGE} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="solde" name="Solde" stroke="#22302a" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="carte-graphique">
        <h3>
          Postes de l’année{' '}
          <select
            className="select-annee"
            value={anneePoste}
            onChange={(e) => onChangeAnnee(Number(e.target.value))}
            aria-label="Année des postes"
          >
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </h3>
        {donneesPostes.length === 0 ? (
          <p className="graphique-vide">Aucune écriture pour cette année.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, donneesPostes.length * 34 + 40)}>
            <ComposedChart data={donneesPostes} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2dc" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#5c6b63' }} tickFormatter={(v: number) => `${v} €`} />
              <YAxis type="category" dataKey="poste" tick={{ fontSize: 12, fill: '#22302a' }} width={140} />
              <Tooltip formatter={(value) => formatEuros(Number(value))} />
              <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                {donneesPostes.map((p) => (
                  <Cell key={p.poste} fill={p.direction === 'recette' ? VERT : ROUGE} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
