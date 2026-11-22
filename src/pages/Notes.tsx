import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import NoteCarte from '../components/NoteCarte'
import NoteForm, { type ChampsNoteSaisie } from '../components/NoteForm'
import {
  chargerNotes,
  chargerTypesNotes,
  creerNote,
  messageErreurNote,
  modifierNote,
  STATUTS,
  supprimerNote,
  type ChampsNote,
  type Note,
  type NoteType,
} from '../lib/notes'
import { afficherLongue, chargerProfils, type Profil } from '../lib/reservations'

interface EtatFormulaire {
  mode: 'creation' | 'edition'
  note?: Note
  initial: ChampsNoteSaisie
}

// Filtres en chaines pour se brancher directement sur les <select> :
// 'tous' pour ne rien filtrer, 'sans' pour un statut nul, sinon la valeur.
type FiltreType = string
type FiltreStatut = string

const texteCompte = (n: number, total: number): string => {
  const mot = n > 1 ? 'notes' : 'note'
  return n === total ? `${n} ${mot}` : `${n} ${mot} sur ${total}`
}

export default function Notes() {
  const { session } = useAuth()
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [types, setTypes] = useState<NoteType[]>([])
  const [profils, setProfils] = useState<Profil[]>([])
  const [filtreType, setFiltreType] = useState<FiltreType>('tous')
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous')
  const [formulaire, setFormulaire] = useState<EtatFormulaire | null>(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [enCours, setEnCours] = useState(false)

  const utilisateur = session?.user.id ?? ''

  const recharger = useCallback(async () => {
    try {
      const [n, t, p] = await Promise.all([chargerNotes(), chargerTypesNotes(), chargerProfils()])
      setNotes(n)
      setTypes(t)
      setProfils(p)
      return true
    } catch {
      setErreur('Impossible de charger les notes. Recharge la page et réessaie.')
      return false
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  const filtrees = useMemo(() => {
    if (!notes) return []
    return notes.filter((n) => {
      if (filtreType !== 'tous' && n.type_id !== Number(filtreType)) return false
      if (filtreStatut === 'sans' && n.status !== null) return false
      if (filtreStatut !== 'tous' && filtreStatut !== 'sans' && n.status !== filtreStatut) return false
      return true
    })
  }, [notes, filtreType, filtreStatut])

  const nomAuteur = (n: Note): string =>
    profils.find((p) => p.id === n.created_by)?.display_name ?? 'un membre'

  const nomModifieur = (n: Note): string | null =>
    n.updated_by ? profils.find((p) => p.id === n.updated_by)?.display_name ?? 'un membre' : null

  const metaNote = (n: Note): string => {
    const creee = `Créée par ${nomAuteur(n)} le ${afficherLongue(n.created_at)}`
    const modifieur = nomModifieur(n)
    if (modifieur) return `${creee} · modifiée par ${modifieur} le ${afficherLongue(n.updated_at)}`
    return creee
  }

  const reinitialiserFiltres = () => {
    setFiltreType('tous')
    setFiltreStatut('tous')
  }

  const boutonNouvelle = () => {
    setErreur('')
    setInfo('')
    setFormulaire({
      mode: 'creation',
      initial: {
        type_id: types[0]?.id ?? 0,
        title: '',
        content: '',
        location: '',
        status: null,
      },
    })
  }

  const ouvrir = (n: Note) => {
    setErreur('')
    setInfo('')
    setFormulaire({
      mode: 'edition',
      note: n,
      initial: {
        type_id: n.type_id,
        title: n.title,
        content: n.content ?? '',
        location: n.location ?? '',
        status: n.status,
      },
    })
  }

  const valider = async (champs: ChampsNote) => {
    setErreur('')
    setInfo('')
    if (champs.title === '') {
      setErreur('Le titre est obligatoire.')
      return
    }
    setEnCours(true)
    try {
      if (formulaire?.mode === 'edition' && formulaire.note) {
        await modifierNote(formulaire.note.id, champs, utilisateur)
      } else {
        await creerNote({ ...champs, created_by: utilisateur })
      }
      setFormulaire(null)
      setInfo('Note enregistrée.')
      await recharger()
    } catch (e) {
      setErreur(messageErreurNote(e))
    }
    setEnCours(false)
  }

  // La confirmation de suppression se fait dans le formulaire (bloc rouge),
  // sans fenetre native du navigateur.
  const supprimer = async () => {
    if (!formulaire?.note) return
    setEnCours(true)
    setErreur('')
    try {
      await supprimerNote(formulaire.note.id)
      setFormulaire(null)
      setInfo('Note supprimée.')
      await recharger()
    } catch (e) {
      setErreur(messageErreurNote(e))
    }
    setEnCours(false)
  }

  if (!session) return null

  return (
    <section className="module">
      <div className="planning-tete">
        <h2>Bons plans, améliorations et incidents</h2>
        <button className="btn principal" type="button" onClick={boutonNouvelle}>
          Nouvelle note
        </button>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}
      {info && <p className="info">{info}</p>}

      {formulaire && (
        <NoteForm
          key={formulaire.mode === 'edition' ? (formulaire.note?.id ?? 'edition') : 'creation'}
          initial={formulaire.initial}
          types={types}
          enEdition={formulaire.mode === 'edition'}
          meta={formulaire.note ? metaNote(formulaire.note) : undefined}
          enCours={enCours}
          onValide={valider}
          onSupprime={formulaire.mode === 'edition' ? supprimer : undefined}
          onAnnule={() => setFormulaire(null)}
        />
      )}

      {notes !== null && (
        <div className="notes-filtres">
          <div className="champ">
            <label htmlFor="filtre-type">Type</label>
            <select id="filtre-type" value={filtreType} onChange={(e) => setFiltreType(e.target.value)}>
              <option value="tous">Tous les types</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="filtre-statut">Statut</label>
            <select id="filtre-statut" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
              <option value="tous">Tous les statuts</option>
              {STATUTS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
              <option value="sans">Sans statut</option>
            </select>
          </div>
          <button className="btn fantome" type="button" onClick={reinitialiserFiltres}>
            Réinitialiser les filtres
          </button>
          <span className="notes-compte">{texteCompte(filtrees.length, notes.length)}</span>
        </div>
      )}

      {notes === null ? (
        <p className="a-venir">Chargement des notes…</p>
      ) : notes.length === 0 ? (
        <p className="a-venir">Aucune note pour le moment. Crée la première avec « Nouvelle note ».</p>
      ) : filtrees.length === 0 ? (
        <p className="a-venir">Aucune note ne correspond aux filtres actuels.</p>
      ) : (
        <>
          <div className="notes-desktop">
            {filtrees.map((n) => (
              <NoteCarte
                key={n.id}
                note={n}
                type={types.find((t) => t.id === n.type_id)}
                auteur={nomAuteur(n)}
                modifieur={nomModifieur(n)}
                variante="desktop"
                onClick={() => ouvrir(n)}
              />
            ))}
          </div>
          <div className="notes-mobile">
            {filtrees.map((n) => (
              <NoteCarte
                key={n.id}
                note={n}
                type={types.find((t) => t.id === n.type_id)}
                auteur={nomAuteur(n)}
                modifieur={nomModifieur(n)}
                variante="mobile"
                onClick={() => ouvrir(n)}
              />
            ))}
          </div>
        </>
      )}

      <p className="planning-aide aide-desktop">
        Clique sur une carte pour consulter et modifier une note. Tout membre peut créer, modifier ou
        supprimer une note, y compris celle d’un autre membre. Filtre la liste par type et par statut.
      </p>
      <p className="planning-aide aide-mobile">
        Appuie sur « Nouvelle note » pour en créer une, ou sur une carte pour la consulter ou la modifier.
        Les filtres par type et par statut se règlent au-dessus de la liste.
      </p>
    </section>
  )
}
