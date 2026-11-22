-- scripts/compta-demo-2026.sql
-- Exercice complet de démonstration 2026 pour le jalon J5 (module comptabilité).
-- À exécuter UNE SEULE FOIS dans le SQL editor du dashboard Supabase (projet
-- MyMeteo, schéma exposé 'resa'), APRÈS la migration
-- scripts/migrations/001_compta_regle_par_date_reglement.sql (colonnes
-- regle_par / date_reglement). Le script est sans effet si des écritures
-- de l'année 2026 existent déjà : aucune donnée réelle n'est modifiée.
-- L'auteur des écritures et le bénéficiaire des règlements est le premier
-- profil administrateur (Vincent) ; la date de règlement est la date de
-- l'écriture.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM resa.accounting_entries
    WHERE entry_date >= DATE '2026-01-01'
      AND entry_date < DATE '2027-01-01'
  ) THEN
    RAISE NOTICE 'Des écritures 2026 existent déjà : aucune insertion.';
    RETURN;
  END IF;

  INSERT INTO resa.accounting_entries (category_id, amount, entry_date, label, comment, created_by, regle_par, date_reglement)
  SELECT c.id,
         v.montant,
         v.date_ecriture,
         v.libelle,
         v.commentaire,
         (SELECT id FROM resa.profiles WHERE is_admin ORDER BY created_at LIMIT 1),
         (SELECT id FROM resa.profiles WHERE is_admin ORDER BY created_at LIMIT 1),
         v.date_ecriture
  FROM (VALUES
    -- Coûts fixes
    (1, 1280.00::numeric, DATE '2026-01-19', 'Taxe d''habitation 2026'::text, NULL::text),
    (2, 1010.00::numeric, DATE '2026-10-15', 'Taxe foncière 2026'::text, NULL::text),
    -- Eau, par trimestre
    (3, 80.50::numeric,  DATE '2026-03-31', 'Eau — 1er trimestre 2026'::text, NULL::text),
    (3, 88.20::numeric,  DATE '2026-06-30', 'Eau — 2e trimestre 2026'::text, NULL::text),
    (3, 95.40::numeric,  DATE '2026-09-30', 'Eau — 3e trimestre 2026'::text, NULL::text),
    -- Électricité, par trimestre (été = climatisation)
    (4, 265.00::numeric, DATE '2026-03-31', 'Électricité — 1er trimestre 2026'::text, NULL::text),
    (4, 315.00::numeric, DATE '2026-06-30', 'Électricité — 2e trimestre 2026'::text, NULL::text),
    (4, 350.00::numeric, DATE '2026-09-30', 'Électricité — 3e trimestre 2026'::text, 'Climatisation estivale'::text),
    -- Charges de copropriété, par trimestre
    (5, 215.00::numeric, DATE '2026-03-31', 'Charges de copropriété — T1 2026'::text, NULL::text),
    (5, 215.00::numeric, DATE '2026-06-30', 'Charges de copropriété — T2 2026'::text, NULL::text),
    (5, 215.00::numeric, DATE '2026-09-30', 'Charges de copropriété — T3 2026'::text, NULL::text),
    -- Réparations
    (6, 190.00::numeric, DATE '2026-05-12', 'Plombier — fuite sous l''évier'::text, 'Facture n° 2026-041'::text),
    (6, 275.00::numeric, DATE '2026-08-03', 'Serrurier — serrure porte d''entrée'::text, NULL::text),
    -- Travaux
    (7, 1600.00::numeric, DATE '2026-04-10', 'Peinture salon et couloir'::text, 'Devis accepté en janvier 2026'::text),
    -- Recettes : locations
    (8, 620.00::numeric,  DATE '2026-05-16', 'Location — pont de mai'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-07-04', 'Location — semaine du 4 juillet'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-07-11', 'Location — semaine du 11 juillet'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-07-18', 'Location — semaine du 18 juillet'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-07-25', 'Location — semaine du 25 juillet'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-08-01', 'Location — semaine du 1er août'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-08-08', 'Location — semaine du 8 août'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-08-15', 'Location — semaine du 15 août'::text, NULL::text),
    (8, 880.00::numeric,  DATE '2026-08-22', 'Location — semaine du 22 août'::text, NULL::text),
    (8, 580.00::numeric,  DATE '2026-10-24', 'Location — week-end de la Toussaint'::text, NULL::text)
  ) AS v(categorie, montant, date_ecriture, libelle, commentaire)
  JOIN resa.accounting_categories c ON c.id = v.categorie;

  RAISE NOTICE 'Exercice de démonstration 2026 inséré.';
END $$;
