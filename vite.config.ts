import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // GitHub Actions sets this env var; use /mahjong/ for GH Pages, / otherwise
  base: process.env.GITHUB_ACTIONS ? '/mahjong/' : '/',
})
