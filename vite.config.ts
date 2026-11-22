import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base vise le depot GitHub "resa-appart" : le site est servi en sous-chemin
// https://<compte>.github.io/resa-appart/
export default defineConfig({
  plugins: [react()],
  base: '/resa-appart/',
})
