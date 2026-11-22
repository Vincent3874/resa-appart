import { useState, type FormEvent } from 'react'
import { labelReglement, type CategorieCompta, type ChampsEntree } from '../lib/comptabilite'
import { versInputDate, type Profil } from '../lib/reservations'

export interface ChampsEntreeSaisie {
  category_id: number
  amount: string
  entry_date: string
  label: string
  comment: string
  regle_par: string
  date_reglement: string
}

interface Props {
  initial: ChampsEntreeSaisie
  categories: CategorieCompta[]
  admins: Profil[]
  enEdition: boolean
  meta?: string
  enCours: boolean
  onValide: (champs: ChampsEntree) => Promise<void>
  onSupprime?: () => void
  onAnnule: () => void
}

// Formulaire unique de creation et de modification d'une écriture comptable.
// Le sens (coût ou recette) est porté par la catégorie, le montant saisi est
// toujours positif. La suppression se confirme dans le formulaire lui-meme :
// aucun dialogue natif du navigateur, comme pour les reservations et les notes.
export default function EntreeForm({
  initial,
  categories,
  admins,
  enEdition,
  meta,
  enCours,
  onValide,
  onSupprime,
  onAnnule,
}: Props) {
  const [categoryId, setCategoryId] = useState(initial.category_id)
  const [montant, setMontant] = useState(initial.amount)
  const [dateEcriture, setDateEcriture] = useState(initial.entry_date || versInputDate(new Date()))
  const [libelle, setLibelle] = useState(initial.label)
  const [commentaire, setCommentaire] = useState(initial.comment)
  const [reglePar, setReglePar] = useState(initial.regle_par)
  const [dateReglement, setDateReglement] = useState(initial.date_reglement)
  const [confirmeSuppression, setConfirmeSuppression] = useState(false)

  const actives = categories.filter((c) => c.is_active)
  const depenses = actives.filter((c) => c.direction === 'depense')
  const recettes = actives.filter((c) => c.direction === 'recette')

  // Libellés du règlement selon le sens du poste choisi : un coût est payé,
  // une recette est reçue.
  const libReglement = labelReglement(categories.find((c) => c.id === categoryId)?.direction)

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    // Le champ number accepte la virgule française selon les claviers.
    const valeur = Number(montant.replace(',', '.'))
    onValide({
      category_id: categoryId,
      amount: valeur,
      entry_date: dateEcriture,
      label: libelle.trim() === '' ? null : libelle.trim(),
      comment: commentaire.trim() === '' ? null : commentaire.trim(),
      regle_par: reglePar === '' ? null : reglePar,
      date_reglement: dateReglement === '' ? null : dateReglement,
    })
  }

  return (
    <div className="formulaire-res">
      <h3>{enEdition ? "Modifier l'écriture" : 'Nouvelle écriture'}</h3>
      {meta && <p className="meta-res">{meta}</p>}
      <form onSubmit={envoyer}>
        <div className="champ">
          <label htmlFor="categorie-entree">Poste (coût ou recette)</label>
          <select
            id="categorie-entree"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
          >
            <optgroup label="Coûts">
              {depenses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Recettes">
              {recettes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="champ-ligne">
          <div className="champ">
            <label htmlFor="montant-entree">Montant (€)</label>
            <input
              id="montant-entree"
              type="number"
              required
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="ex. : 250,00"
            />
          </div>
          <div className="champ">
            <label htmlFor="date-entree">Date</label>
            <input
              id="date-entree"
              type="date"
              required
              value={dateEcriture}
              onChange={(e) => setDateEcriture(e.target.value)}
            />
          </div>
        </div>
        <div className="champ-ligne">
          <div className="champ">
            <label htmlFor="regle-par">{libReglement.qui} (facultatif)</label>
            <select id="regle-par" value={reglePar} onChange={(e) => setReglePar(e.target.value)}>
              <option value="">—</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="date-reglement">{libReglement.date} (facultatif)</label>
            <input
              id="date-reglement"
              type="date"
              value={dateReglement}
              onChange={(e) => setDateReglement(e.target.value)}
            />
          </div>
        </div>
        <div className="champ">
          <label htmlFor="libelle-entree">Libellé (facultatif)</label>
          <input
            id="libelle-entree"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="ex. : Taxe foncière 2026"
          />
        </div>
        <div className="champ">
          <label htmlFor="commentaire-entree">Commentaire (facultatif)</label>
          <textarea
            id="commentaire-entree"
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Précisions utiles (facture, période concernée…)"
          />
        </div>
        <div className="form-actions">
          <button className="btn principal" type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : enEdition ? 'Enregistrer les modifications' : 'Publier l’écriture'}
          </button>
          {enEdition && onSupprime && !confirmeSuppression && (
            <button
              className="btn danger"
              type="button"
              disabled={enCours}
              onClick={() => setConfirmeSuppression(true)}
            >
              Supprimer
            </button>
          )}
          <button className="btn lien" type="button" onClick={onAnnule}>
            Annuler
          </button>
        </div>
        {confirmeSuppression && (
          <div className="confirmation-suppression">
            <p>Supprimer définitivement cette écriture ?</p>
            <div className="form-actions">
              <button
                className="btn danger"
                type="button"
                disabled={enCours}
                onClick={() => {
                  if (onSupprime) onSupprime()
                }}
              >
                {enCours ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button
                className="btn lien"
                type="button"
                disabled={enCours}
                onClick={() => setConfirmeSuppression(false)}
              >
                Non, conserver
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
