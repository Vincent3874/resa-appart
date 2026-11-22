import { createClient } from '@supabase/supabase-js'

// Clé publishable Supabase : conçue pour vivre dans une SPA publique.
// Les donnees restent protegees par Auth et RLS cote serveur, jamais par cette cle.
export const supabase = createClient(
  'https://gvmogpbbcllkfqmryvwz.supabase.co',
  'sb_publishable_F4IH5ndz17UAPgHC7ihdRg_LiZikjIb',
)
