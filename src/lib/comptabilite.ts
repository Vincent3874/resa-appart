import { supabase } from './supabase'

export type Direction = 'depense' | 'recette'

export interface CategorieCompta {
  id: number
  code: string
  label: string
  direction: Direction
  is_active: boolean
  sort_order: number
}

export interface EntreeCompta {
  id: string
  category_id: number
  amount: number
  entry_date: string
  label: string | null
  comment: string | null
  created_by: string
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface ChampsEntree {
  category_id: number
  amount: number
  entry_date: string
  label: string | null
  comment: string | null
}

// Colonnes des vues SQL du schéma resa (v_compta_solde_annuel, v_compta_poste_annee).
// Les numeric arrivent en JSON ; Number() reste prudent dans le code appelant.
export interface SoldeAnnuel {
  annee: number
  recettes: number | null
  depenses: number | null
  solde: number | null
}

export interface PosteAnnee {
  annee: number
  poste: string
  direction: Direction
  total: number
  nb_ecritures: number
}

// Le contrôle réel reste côté serveur (RLS via resa.est_admin()) ; ce drapeau
// ne sert qu'à l'affichage de l'onglet et à un premier refus propre.
export async function chargerEstAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  if (error) return false
  return data?.is_admin ?? false
}

const COLONNES = 'id, category_id, amount, entry_date, label, comment, created_by, created_at, updated_at, updated_by'

// Toutes les écritures, de la plus récente à la plus ancienne.
// Le volume familial reste tres faible, aucune pagination necessaire.
export async function chargerEntrees(): Promise<EntreeCompta[]> {
  const { data, error } = await supabase
    .from('accounting_entries')
    .select(COLONNES)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as EntreeCompta[]) ?? []
}

// Postes comptables actifs et inactifs (l'historique peut référencer un poste
// desactive) : lecture réservée aux administrateurs par la RLS.
export async function chargerCategories(): Promise<CategorieCompta[]> {
  const { data, error } = await supabase
    .from('accounting_categories')
    .select('id, code, label, direction, is_active, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as CategorieCompta[]) ?? []
}

export async function chargerSoldesAnnuels(): Promise<SoldeAnnuel[]> {
  const { data, error } = await supabase.from('v_compta_solde_annuel').select('*')
  if (error) throw error
  return (data as SoldeAnnuel[]) ?? []
}

export async function chargerPostesAnnee(): Promise<PosteAnnee[]> {
  const { data, error } = await supabase.from('v_compta_poste_annee').select('*')
  if (error) throw error
  return (data as PosteAnnee[]) ?? []
}

export async function creerEntree(champs: ChampsEntree & { created_by: string }): Promise<void> {
  const { error } = await supabase.from('accounting_entries').insert(champs)
  if (error) throw error
}

export async function modifierEntree(id: string, champs: ChampsEntree, auteur: string): Promise<void> {
  const { error } = await supabase
    .from('accounting_entries')
    .update({ ...champs, updated_by: auteur })
    .eq('id', id)
  if (error) throw error
}

export async function supprimerEntree(id: string): Promise<void> {
  const { error } = await supabase.from('accounting_entries').delete().eq('id', id)
  if (error) throw error
}

// ---------- Aides de mise en forme ----------

const fmEuros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const fmDateComplete = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

export function afficherMontant(v: number | string): string {
  return fmEuros.format(Number(v))
}

// entry_date est un date SQL ("2026-03-15") : new Date() le lirait en UTC et
// pourrait afficher la veille selon le fuseau ; on le relit en date locale.
export function afficherDateComplete(v: string): string {
  const [a, m, j] = v.split('-').map(Number)
  return fmDateComplete.format(new Date(a, (m ?? 1) - 1, j ?? 1))
}

// Restitution des erreurs PostgreSQL en francais : jamais de code brut.
export function messageErreurCompta(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === '23514') {
    return 'Le montant doit être strictement positif.'
  }
  if (code === '23503') {
    return 'La catégorie choisie n’existe plus. Recharge la page et réessaie.'
  }
  if (code === '42501') {
    return 'La comptabilité est réservée aux administrateurs.'
  }
  return 'Enregistrement impossible pour le moment. Réessaie dans un instant.'
}
