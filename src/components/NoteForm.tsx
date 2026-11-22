import { useState, type FormEvent } from 'react'
import { STATUTS, statutApplicable, type ChampsNote, type NoteType, type StatutNote } from '../lib/notes'

export interface ChampsNoteSaisie {
  type_id: number
  title: string
  content: string
  location: string
  status: StatutNote | null
}

interface Props {
  initial: ChampsNoteSaisie
  types: NoteType[]
  enEdition: boolean
  meta?: string
  enCours: boolean
  onValide: (champs: ChampsNote) => Promise<void>
  onSupprime?: () => void
  onAnnule: () => void
}

// Formulaire unique de creation et de modification d'une note.
// Le statut n'est propose que pour les types auxquels il s'applique (incident,
// amelioration) ; pour un bon plan, il est enregistre comme nul.
// La suppression se confirme dans le formulaire lui-meme : aucun dialogue natif
// du navigateur, comme pour les reservations.
export default function NoteForm({
  initial,
  types,
  enEdition,
  meta,
  enCours,
  onValide,
  onSupprime,
  onAnnule,
}: Props) {
  const [typeId, setTypeId] = useState(initial.type_id)
  const [titre, setTitre] = useState(initial.title)
  const [contenu, setContenu] = useState(initial.content)
  const [lieu, setLieu] = useState(initial.location)
  const [statut, setStatut] = useState<StatutNote | null>(initial.status)
  const [confirmeSuppression, setConfirmeSuppression] = useState(false)

  const codeType = types.find((t) => t.id === typeId)?.code ?? ''
  const avecStatut = statutApplicable(codeType)

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    onValide({
      type_id: typeId,
      title: titre.trim(),
      content: contenu.trim() === '' ? null : contenu.trim(),
      location: lieu.trim() === '' ? null : lieu.trim(),
      status: avecStatut ? statut : null,
    })
  }

  return (
    <div className="formulaire-res">
      <h3>{enEdition ? 'Modifier la note' : 'Nouvelle note'}</h3>
      {meta && <p className="meta-res">{meta}</p>}
      <form onSubmit={envoyer}>
        <div className="champ">
          <label htmlFor="type-note">Type</label>
          <select
            id="type-note"
            required
            value={typeId}
            onChange={(e) => setTypeId(Number(e.target.value))}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="champ">
          <label htmlFor="titre-note">Titre</label>
          <input
            id="titre-note"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Un titre court pour retrouver la note"
          />
        </div>
        <div className="champ">
          <label htmlFor="contenu-note">Texte (facultatif)</label>
          <textarea
            id="contenu-note"
            rows={4}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Détails, adresse, horaires, marche à suivre…"
          />
        </div>
        <div className="champ-ligne">
          <div className="champ">
            <label htmlFor="lieu-note">Lieu (facultatif)</label>
            <input
              id="lieu-note"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              placeholder="Ex. : cuisine, plage de Saint-Clair"
            />
          </div>
          {avecStatut && (
            <div className="champ">
              <label htmlFor="statut-note">Statut</label>
              <select
                id="statut-note"
                value={statut ?? ''}
                onChange={(e) => setStatut(e.target.value === '' ? null : (e.target.value as StatutNote))}
              >
                <option value="">Non défini</option>
                {STATUTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="form-actions">
          <button className="btn principal" type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : enEdition ? 'Enregistrer les modifications' : 'Publier la note'}
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
            <p>Supprimer définitivement cette note ?</p>
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
