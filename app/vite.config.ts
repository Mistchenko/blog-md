import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      // SV5UI импортирует модуль SvelteKit, которого нет в приложении на чистом Vite
      '$app/state': fileURLToPath(new URL('./src/lib/sveltekit-state.ts', import.meta.url)),
    },
  },
  // sv5ui не пребандлится: иначе замена `$app/state` попала бы внутрь бандла
  // со своей копией роутера
  optimizeDeps: {
    exclude: ['sv5ui'],
  },
  // Кэш вне смонтированной директории, чтобы на хосте не появлялся node_modules/.vite
  cacheDir: process.env.VITE_CACHE_DIR ?? 'node_modules/.vite',
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:8000',
    },
  },
})
