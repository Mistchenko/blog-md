/**
 * Замена модуля SvelteKit `$app/state` для приложения на чистом Vite.
 * Компоненты SV5UI (Link, Header, Sidebar, NavigationMenu) читают из него только
 * `page.url`, чтобы подсвечивать активную ссылку; подключается через alias в vite.config.ts.
 */
import { router } from './router.svelte'

export const page = {
  get url(): URL {
    return new URL(router.pathname + location.search + location.hash, location.origin)
  },
}
