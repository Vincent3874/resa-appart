import { supabase } from './supabase'
import { couleurOccupant } from './reservations'

export type StatutNote = 'a_traiter' | 'en_cours' | 'resolu' | 'sans_objet'

export interface NoteType {
  id: number
  code: string
  label: string
  sort_order: number
}

export interface Note {
  id: string
  type_id: number
  title: string
  content: string | null
  location: string | null
  status: StatutNote | null
  created_by: string
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface ChampsNote {
  type_id: number
  title: string
  content: string | null
  location: string | null
  status: StatutNote | null
}

// Statuts acceptes par la contrainte notes_status_valide, avec libelles francais.
export const STATUTS: { code: StatutNote; label: string }[] = [
  { code: 'a_traiter', label: 'À traiter' },
  { code: 'en_cours', label: 'En cours' },
  { code: 'resolu', label: 'Résolu' },
  { code: 'sans_objet', label: 'Sans objet' },
]

export function labelStatut(statut: StatutNote | null): string {
  if (!statut) return ''
  return STATUTS.find((s) => s.code === statut)?.label ?? statut
}

// Le statut ne s'applique qu'aux incidents et aux propositions d'amelioration ;
// un bon plan reste sans statut.
export function statutApplicable(codeType: string): boolean {
  return codeType === 'incident' || codeType === 'amelioration'
}

// Couleur deterministe d'un type de note : meme fonction hsl par nom que les occupants.
export function couleurType(code: string): { fond: string; texte: string } {
  return couleurOccupant(code)
}

const COLONNES = 'id, type_id, title, content, location, status, created_by, created_at, updated_at, updated_by'

// Toutes les notes, de la plus recente a la plus ancienne.
// Le volume familial reste tres faible, aucune pagination necessaire.
export async function chargerNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(COLONNES)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Note[]) ?? []
}

// Types de notes : lecture ouverte a tout membre authentifie (RLS), l'ecriture
// reste reservee aux administrateurs cote serveur.
export async function chargerTypesNotes(): Promise<NoteType[]> {
  const { data, error } = await supabase
    .from('note_types')
    .select('id, code, label, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as NoteType[]) ?? []
}

export async function creerNote(champs: ChampsNote & { created_by: string }): Promise<void> {
  const { error } = await supabase.from('notes').insert(champs)
  if (error) throw error
}

export async function modifierNote(id: string, champs: ChampsNote, auteur: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ ...champs, updated_by: auteur })
    .eq('id', id)
  if (error) throw error
}

export async function supprimerNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

// Restitution des erreurs PostgreSQL en francais : jamais de code brut.
export function messageErreurNote(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === '23514') {
    return 'Le statut choisi n’est pas prévu ici. Choisis un statut de la liste ou laisse-le vide.'
  }
  if (code === '23503') {
    return 'Le type de note choisi n’existe plus. Recharge la page et réessaie.'
  }
  if (code === '42501') {
    return 'Cette action t’est refusée par les droits d’accès. Contacte un administrateur si tu penses que c’est une erreur.'
  }
  return 'Enregistrement impossible pour le moment. Réessaie dans un instant.'
}
