import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// base vise le depot GitHub "resa-appart" : le site est servi en sous-chemin
// https://<compte>.github.io/resa-appart/

// L'app est une SPA en BrowserRouter : au rechargement d'une URL directe
// (ex. /resa-appart/connexion), GitHub Pages cherche un fichier et renvoie 404.
// Pages sert 404.html pour toute URL inconnue : en y copiant index.html, le
// navigateur recharge l'app, qui relit l'URL et affiche la bonne route.
// Les assets etant references en chemins absolus (/resa-appart/assets/...),
// la copie fonctionne telle quelle. Aucune nouvelle dependance.
function copierIndexEn404(): Plugin {
  return {
    name: 'copier-index-en-404',
    apply: 'build',
    closeBundle() {
      copyFileSync(
        fileURLToPath(new URL('./dist/index.html', import.meta.url)),
        fileURLToPath(new URL('./dist/404.html', import.meta.url)),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), copierIndexEn404()],
  base: '/resa-appart/',
})
