import { couleurType, labelStatut, type Note, type NoteType } from '../lib/notes'
import { afficherLongue } from '../lib/reservations'

interface Props {
  note: Note
  type: NoteType | undefined
  auteur: string
  modifieur: string | null
  variante: 'desktop' | 'mobile'
  onClick: () => void
}

// Premier extrait du texte : la premiere ligne non vide, tronquee par la CSS.
function extrait(contenu: string | null): string {
  if (!contenu) return ''
  const ligne = contenu.split('\n').find((l) => l.trim() !== '')
  return (ligne ?? '').trim()
}

// Carte d'une note. Deux restitutions coexistent dans le DOM (grille de cartes
// sur ecran large, liste compacte sur ecran etroit) et la feuille de style
// choisit laquelle afficher sous 620 px, comme pour le calendrier.
export default function NoteCarte({ note, type, auteur, modifieur, variante, onClick }: Props) {
  const couleur = couleurType(type?.code ?? '')
  const extraitTexte = extrait(note.content)
  const meta = `${auteur} · ${afficherLongue(note.created_at)}${
    modifieur ? ` · modifiée le ${afficherLongue(note.updated_at)}` : ''
  }`

  if (variante === 'mobile') {
    return (
      <button type="button" className="note-mobile" onClick={onClick}>
        <span className="pastille" style={{ background: couleur.fond, borderColor: couleur.texte }} />
        <span className="infos">
          <span className="nom">
            <span className="badge-note" style={{ background: couleur.fond, color: couleur.texte, borderColor: couleur.texte }}>
              {type?.label ?? 'Note'}
            </span>{' '}
            {note.title}
          </span>
          <span className="dates">
            {note.status ? `${labelStatut(note.status)} · ` : ''}
            {note.location ? `${note.location} · ` : ''}
            {meta}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="note-carte" onClick={onClick}>
      <span className="note-badges">
        <span className="badge-note" style={{ background: couleur.fond, color: couleur.texte, borderColor: couleur.texte }}>
          {type?.label ?? 'Note'}
        </span>
        {note.status && <span className="badge-note badge-statut">{labelStatut(note.status)}</span>}
      </span>
      <span className="note-titre">{note.title}</span>
      {extraitTexte && <span className="note-extrait">{extraitTexte}</span>}
      <span className="note-meta">
        {note.location ? `Lieu : ${note.location} · ` : ''}
        {meta}
      </span>
    </div>
  )
}
