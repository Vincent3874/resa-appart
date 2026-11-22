# Resa-Appart - Réservations de l'appartement familial

Site familial de gestion des réservations de l'appartement : planning, notes
(bons plans, améliorations, incidents) et comptabilité réservée aux
administrateurs.

## Architecture

- SPA React avec Vite et TypeScript, hébergée sur GitHub Pages.
- Backend Supabase (BaaS) : authentification par code OTP à six chiffres,
  données dans le schéma `resa` du projet Supabase MyMeteo.
- Sécurité : la clé publishable incluse dans le site est conçue pour être
  publique ; chaque table est protégée par la Row Level Security côté serveur,
  la comptabilité n'est accessible qu'aux administrateurs (fonction
  `resa.est_admin()`).
- Aucune inscription libre : les comptes sont créés sur invitation par un
  administrateur dans le dashboard Supabase (option `shouldCreateUser` à false
  côté client).

## Développement

```bash
npm install
npm run dev      # serveur local
npm run build    # contrôle de types + build de production
npm run preview  # prévisualisation du build
```

## Déploiement

Chaque poussée sur la branche `main` déclenche le workflow GitHub Actions
(`.github/workflows/deploy.yml`) qui contrôle les types, construit le site et
le publie sur GitHub Pages :

https://vincent3874.github.io/resa-appart/

Prérequis une seule fois : dans les réglages du dépôt, section Pages, choisir
GitHub Actions comme source.

## Structure

```
src/
  lib/supabase.ts          client Supabase (URL + clé publishable)
  auth/AuthContext.tsx     état de session (contexte React)
  components/Layout.tsx    bandeau, navigation, déconnexion
  pages/Login.tsx          connexion par code OTP
  pages/Planning.tsx      jalon J3 : planning des réservations
  pages/Notes.tsx         jalon J4 : notes
  pages/Comptabilite.tsx   jalon J5 : comptabilité
```

## Jalons

- J1 Provisionnement Supabase : réalisé (schéma `resa`, RLS, contraintes,
  vues SQL, compte administrateur).
- J2 Socle applicatif : ce dépôt (connexion OTP, navigation, déploiement).
- J3 Planning des réservations.
- J4 Notes.
- J5 Comptabilité.
- J6 Recette familiale puis invitations des comptes.
