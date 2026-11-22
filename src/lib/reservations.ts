import { supabase } from './supabase'

export interface Reservation {
  id: string
  user_id: string
  occupant: string
  start_ts: string
  end_ts: string
  comment: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface Profil {
  id: string
  display_name: string
}

const COLONNES = 'id, user_id, occupant, start_ts, end_ts, comment, created_at, updated_at, updated_by'

// Fenetre large chargee une seule fois : cinq ans dans le passe, trois ans a venir.
// Le volume familial reste tres faible, aucune pagination necessaire.
export async function chargerReservations(): Promise<Reservation[]> {
  const debut = new Date()
  debut.setFullYear(debut.getFullYear() - 5)
  const fin = new Date()
  fin.setFullYear(fin.getFullYear() + 3)
  const { data, error } = await supabase
    .from('reservations')
    .select(COLONNES)
    .gte('end_ts', debut.toISOString())
    .lte('start_ts', fin.toISOString())
    .order('start_ts', { ascending: true })
  if (error) throw error
  return (data as Reservation[]) ?? []
}

export async function chargerProfils(): Promise<Profil[]> {
  const { data, error } = await supabase.from('profiles').select('id, display_name')
  if (error) throw error
  return (data as Profil[]) ?? []
}

export async function creerReservation(champs: {
  user_id: string
  occupant: string
  start_ts: string
  end_ts: string
  comment: string | null
}): Promise<void> {
  const { error } = await supabase.from('reservations').insert(champs)
  if (error) throw error
}

export async function modifierReservation(
  id: string,
  champs: { occupant: string; start_ts: string; end_ts: string; comment: string | null },
  auteur: string,
): Promise<void> {
  const { error } = await supabase
    .from('reservations')
    .update({ ...champs, updated_by: auteur })
    .eq('id', id)
  if (error) throw error
}

export async function supprimerReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id)
  if (error) throw error
}

// ---------- Aides de dates et de mise en forme ----------

const fmJourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const fmMoisAnnee = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const fmLongue = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

export function afficherJour(valeur: Date | string): string {
  return fmJourMois.format(new Date(valeur))
}

export function titreMois(annee: number, mois: number): string {
  return fmMoisAnnee.format(new Date(annee, mois, 1))
}

export function afficherLongue(valeur: Date | string): string {
  return fmLongue.format(new Date(valeur))
}

export function versInputDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

export function versInputHeure(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${mi}`
}

export function depuisInputs(date: string, heure: string): Date {
  return new Date(`${date}T${heure}`)
}

// Intervalle semi-ouvert [a1, a2) : deux sejours peuvent se toucher a midi.
export function chevauche(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1 < b2 && b1 < a2
}

// Couleur deterministe par occupant : le meme nom garde toujours la meme teinte.
export function couleurOccupant(nom: string): { fond: string; texte: string } {
  const cle = nom.trim().toLowerCase()
  let h = 0
  for (let i = 0; i < cle.length; i++) {
    h = (h * 31 + cle.charCodeAt(i)) % 997
  }
  const teinte = (h * 37 + 205) % 360
  return { fond: `hsl(${teinte}, 55%, 88%)`, texte: `hsl(${teinte}, 45%, 26%)` }
}

// Lundi precedent le premier jour du mois, pour des semaines commencaant le lundi.
export function debutDeGrille(annee: number, mois: number): Date {
  const premier = new Date(annee, mois, 1)
  const ecart = (premier.getDay() + 6) % 7
  return new Date(annee, mois, 1 - ecart)
}
