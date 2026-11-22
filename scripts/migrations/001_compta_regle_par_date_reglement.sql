-- scripts/migrations/001_compta_regle_par_date_reglement.sql
-- J5 bis « Règlements par membre » : deux colonnes facultatives sur
-- resa.accounting_entries pour savoir quel membre administrateur a payé un
-- coût ou reçu une recette, et à quelle date.
--
-- À exécuter UNE SEULE FOIS dans le SQL editor du dashboard Supabase (projet
-- MyMeteo, schéma exposé 'resa'), AVANT de déployer le front correspondant.
-- La RLS existante de la table (resa.est_admin()) couvre les nouvelles
-- colonnes : aucune policy supplémentaire n'est nécessaire.
-- Aucun GRANT supplémentaire : les privilèges de table incluent les colonnes.

ALTER TABLE resa.accounting_entries
  ADD COLUMN IF NOT EXISTS regle_par uuid REFERENCES resa.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_reglement date;

-- Optionnel, à décommenter si l'on veut renseigner les règlements sur les
-- écritures de démonstration 2026 déjà en place (auteur = 1er profil admin,
-- date de règlement = date de l'écriture) :
--
-- UPDATE resa.accounting_entries
-- SET regle_par = (SELECT id FROM resa.profiles WHERE is_admin ORDER BY created_at LIMIT 1),
--     date_reglement = entry_date
-- WHERE regle_par IS NULL;
