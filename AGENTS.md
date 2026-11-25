# AGENTS.md — resa-appart

Consignes pour l'agent de code (Vibe CLI) travaillant sur ce dépôt.
À lire intégralement avant toute modification. Le texte s'adresse à toi, l'agent, sur le mode du tutoiement.

## 1. Le projet en une page

Site web familial de réservation d'un appartement de vacances, partagé entre
les membres de la famille et quelques amis. Trois modules :

1. Réservations (J3, clos, en service) : chaque membre authentifié peut
   créer, modifier et supprimer toute réservation, y compris pour des amis.
2. Notes (J4, à réaliser) : bons plans, propositions d'amélioration,
   incidents.
3. Comptabilité (J5, clos, en service) : coûts et recettes de
   l'appartement et règlements par membre, accès réservé aux administrateurs.

Le site est une SPA statique déployée sur GitHub Pages :
https://vincent3874.github.io/resa-appart/
Le dépôt est public ; toute information sensible relève donc uniquement
d'Auth et de la RLS côté Supabase, jamais de l'obscurité.

## 2. Stack et règles techniques

- Vite 5 + React 18 + TypeScript strict. `npx tsc --noEmit` doit passer
  sans erreur avant tout commit.
- react-router (basename `import.meta.env.BASE_URL`, le site est servi
  depuis un sous-chemin Pages).
- `@supabase/supabase-js`, client créé dans `src/lib/supabase.ts` avec
  l'option `db: { schema: 'resa' }` : toutes les tables applicatives vivent
  hors de `public`, cette option est indispensable.
- Pas de bibliothèque d'état ni de cache : chargement direct au montage
  (une requête large suffit), rechargement après chaque mutation.
  Exception prévue : récharts pour les visualisations du jalon J5.
- Aucune autre nouvelle dépendance sans raison écrite dans le commit.
- Textes de l'interface en français, au tutoiement. Dates et heures
  exclusivement via `Intl` en `fr-FR` (les helpers existent dans
  `src/lib/reservations.ts`, les réutiliser).

## 3. Déploiement et vérification

- Le push sur `main` déclenche le workflow GitHub Actions
  (`.github/workflows/deploy.yml` : `npm install`, `tsc --noEmit`,
  `vite build`, publication Pages). Un push est un déploiement.
- La SPA utilise BrowserRouter : `vite.config.ts` copie `dist/index.html` en
  `dist/404.html` au build, pour que GitHub Pages serve l'application (et non
  une erreur 404) au rechargement d'une URL directe comme `/connexion`.
- Ne jamais pousser sans demande explicite. Committer localement n'est pas
  déployer : attendre la validation avant le push.
- Après un push, vérifier le run dans l'onglet Actions du dépôt, puis le
  site réel. Une livraison n'est finie qu'après vérification sur le site.
- Messages de commit en français, descriptifs, une préoccupation par commit
  (par exemple : « Module notes : filtre par type »).

## 4. Données Supabase

Projet Supabase « MyMeteo » : https://gvmogpbbcllkfqmryvwz.supabase.co
(clé publishable dans `src/lib/supabase.ts`, conçue pour être publique).

Schéma applicatif : `resa` (déjà créé, déjà exposé à l'API Data, déjà
protégé par la RLS). Tables :

- `resa.profiles` : id (uuid, vers auth.users), display_name, is_admin.
  Le profil est créé par un trigger à l'inscription.
- `resa.reservations` : occupant (texte libre), start_ts, end_ts
  (timestamptz), comment, user_id, updated_by, created_at, updated_at.
  Contrainte d'exclusion `reservations_sans_chevauchement` sur l'intervalle
  tstzrange semi-ouvert (règle métier midi, voir §5).
- `resa.note_types` : types de notes. Lecture par tout membre, écriture
  réservée aux administrateurs.
- `resa.notes` : notes liées à note_types, champ `location` optionnel
  (utile aux incidents), statut applicable aux incidents et améliorations.
- `resa.accounting_categories` + `resa.accounting_entries` :
  montants strictement positifs, le sens (coût ou recette) est porté par la
  catégorie. `accounting_entries` porte en outre `regle_par` (uuid vers
  `profiles`, facultatif : membre ayant payé le coût ou reçu la recette) et
  `date_reglement` (date facultative), ajoutés par la migration
  `scripts/migrations/001_compta_regle_par_date_reglement.sql`.
- Vues SQL : `resa.v_compta_poste_annee`, `resa.v_compta_solde_annuel`
  (jalon J5).

Avant d'écrire un CRUD, vérifie les colonnes exactes dans le tableau de
bord Supabase (Table Editor) : cette liste indique le périmètre, pas le
détail colonne par colonne.

## 5. Règles métier des réservations

- Règle de midi : séjour du 12h00 d'arrivée au 12h00 de départ, intervalle
  semi-ouvert. Deux séjours peuvent se toucher à midi, jamais se chevaucher.
- Le formulaire prédéfinit 12h00/12h00 ; le réglage fin des heures est
  dépliable, pas imposé.
- Le champ occupant est un texte libre (les amis n'ont pas de compte),
  assisté par une datalist des noms déjà connus (profils + occupants).
- L'erreur 23P01 (contrainte d'exclusion) doit être restituée avec
  l'occupant et les dates de la réservation en conflit, retrouvée dans la
  liste déjà chargée. L'erreur 23514 se traduit en « Le départ doit être
  postérieur à l'arrivée ». Traduire toute erreur PostgreSQL en français,
  jamais afficher un code brut.
- La couleur d'un occupant est déterministe : fonction hsl par nom dans
  `src/lib/reservations.ts`, à réutiliser partout (pas de couleur libre).

## 6. Authentification

- Connexion par code OTP envoyé par courriel (signInWithOtp avec
  shouldCreateUser false, verifyOtp type email). Le code fait huit chiffres
  sur ce projet, le champ en accepte dix (ne pas restreindre).
- Inscription libre désactivée : les comptes sont créés dans le tableau de
  bord Supabase. Ne jamais réactiver l'inscription libre.
- Le service de courriel intégré limite à deux courriels par heure et par
  projet : brancher l'erreur 429 sur le message dédié déjà présent dans
  `Login.tsx`. Un SMTP personnalisé est prévu pour le jalon J6.

## 7. Conventions d'interface (obligatoires)

 La charte est dans `src/index.css` (variables CSS : --vert-fonce,
--vert-clair, --encre, --bordure, --rayon...). Conserver la cohérence.

Motifs établis au jalon J3, à réutiliser sans exception :

1. Confirmation destructive intégrée : jamais `window.confirm`. Premier
   clic sur « Supprimer » ouvre un bloc rouge dans le formulaire avec
   « Oui, supprimer » / « Non, conserver » (voir ReservationForm.tsx,
   état local de confirmation).
2. Restitutions mobiles : sous 620 px, produire les deux restitutions
   dans le DOM (desktop + mobile) et basculer par CSS pur avec
   `@media (max-width: 620px)`, jamais de détection d'appareil en
   JavaScript. Le calendrier emploi ce motif (`cal-desktop` /
   `cal-mobile`), de même que les messages d'aide (`aide-desktop` /
   `aide-mobile`). Le module notes emploiera des cartes en liste, la
   comptabilité des tableaux à défilement.
3. Aide contextuelle : un texte d'aide par vue et par largeur d'écran,
   placé sous le contenu.
4. Chargement : indiquer « Chargement du planning… » plutôt qu'un écran
   vide ; restituer les erreurs dans un encart rouge `.erreur` et les
   confirmations dans un encart vert `.info`.

## 8. Jalons restants

### J4 — Module notes

- CRUD complet pour tout membre authentifié, sur toutes les notes.
- Types de notes : lecture pour le formulaire par tout membre, création et
  modification réservées à l'is_admin (le tableau `note_types` est déjà
  verrouillé ainsi par RLS, le front doit seulement assumer les refus).
- Prévoir dans note_types au minimum : bon plan, amélioration, incident.
- Statut applicable aux incidents et améliorations (neuf, en cours, clos).
- Champ `location` libre et optionnel.
- Interface : liste filtrable par type et statut, formulaire unique
  création/modification, confirmation de suppression intégrée (motif §7.1),
  cartes responsives (motif §7.2).

### J5 — Module comptabilité (clos, en service)

- Accès strictement réservé aux administrateurs : la colonne
  `profiles.is_admin` du profil détermine l'affichage de l'onglet ;
  la RLS (fonction `resa.est_admin()`) reste le contrôle réel côté serveur.
  Gérer proprement un refus pour un non-admin.
- Saisie des coûts (taxe habitation, taxe foncière, eau, électricité,
  charges de copropriété, réparations, travaux) et des recettes par
  catégorie et par année. Montants positifs seulement.
- Démarrage : saisir un exercice complet de démonstration pour donner du
  sens aux vues.
- Visualisations temporelles et par poste avec récharts, en appui sur les
  vues SQL existantes `v_compta_poste_annee` et `v_compta_solde_annuel`.
- Tableaux à défilement horizontal sur mobile (choix assumé).

### J5 bis — Règlements par membre (clos, en service)

- Colonnes `regle_par` (uuid vers `profiles`, facultatif) et
  `date_reglement` (date, facultative) sur `resa.accounting_entries`, posées
  par la migration `scripts/migrations/001_compta_regle_par_date_reglement.sql`
  à exécuter dans le SQL editor du dashboard (jamais de clé service côté
  client). La RLS existante de la table couvre les nouvelles colonnes.
- Saisie facultative dans le formulaire d'écriture : membre administrateur
  (profils `is_admin`) et date ; libellés adaptés au sens — « Payé par » /
  « Date de paiement » pour un coût, « Reçu par » / « Date d'encaissement »
  pour une recette.
- Tableau des écritures : colonnes « Payé/reçu par » et « Date de
  règlement » ; graphique de répartition par membre et par année (payé vs
  reçu) pour équilibrer les comptes en fin d'année.
- Les données de démonstration 2026 sont conservées volontairement pour la
  présentation à la famille.

### J6 — Recette familiale

- Invitations des comptes depuis le tableau de bord Supabase (pas depuis
  le site), is_admin pour les administrateurs pressentis.
- SMTP personnalisé (une adresse Gmail dédiée suffit) pour lever la limite
  de deux courriels par heure.
- Mode d'emploi court sur la page d'accueil, corrections ergonomiques.

## 9. Interdits absolus

- Jamais de clé service_role dans le dépôt ou côté client. La clé
  publishable seule, partout.
- Ne jamais désactiver ni affaiblir la RLS, ne jamais modifier une policy
  sans script SQL versionné et explicite.
- Ne pas toucher au schéma `public` ni aux tables de la station météo :
  elles partagent le projet Supabase.
- Un nouveau schéma ou une nouvelle table nécessitent : migration SQL
  versionnée + ajout aux schémas exposés + RLS avant toute utilisation.
- Ne pas modifier les réglages d'authentification (gabarits de courriel,
  inscription libre, limites) sans demande explicite.

## 10. Avant de considérer un travail terminé

1. `npx tsc --noEmit` puis `npm run build` passent localement.
2. Recette manuelle de la fonction livrée (création, lecture, modification,
   suppression, collisions d'horaires éventuelles, restitution mobile
   en simulation 360 px).
3. Commit en français paraphrasant le changement, sans push si non demandé.
4. Communiquer la liste des vérifications effectuées et de celles qui
   restent à la charge de Vincent.
