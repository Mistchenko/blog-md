import { articlePathFromUrl, HOME_ARTICLE } from './paths'

export type Route =
  | { name: 'home'; articlePath: string }
  | { name: 'article'; articlePath: string }
  | { name: 'not-found' }

function parse(pathname: string): Route {
  if (pathname === '/') return { name: 'home', articlePath: HOME_ARTICLE }
  const articlePath = articlePathFromUrl(pathname)
  return articlePath ? { name: 'article', articlePath } : { name: 'not-found' }
}

/** Маршрутизатор на History API. */
class Router {
  pathname = $state(location.pathname)
  route = $derived(parse(this.pathname))

  constructor() {
    window.addEventListener('popstate', () => {
      this.pathname = location.pathname
    })
  }

  navigate(url: string) {
    const target = new URL(url, location.href)
    if (target.pathname === location.pathname && target.hash === location.hash) return
    history.pushState(null, '', target)
    this.pathname = target.pathname
  }
}

export const router = new Router()

/** onclick для внутренних ссылок `<a href="/...">`: переход без перезагрузки страницы. */
export function handleLinkClick(event: MouseEvent): void {
  if (!isPlainLeftClick(event)) return
  const url = internalLinkUrl(event.target)
  if (!url) return
  event.preventDefault()
  router.navigate(url.pathname + url.hash)
}

/** Клик левой кнопкой без модификаторов: Cmd/Ctrl/Shift/Alt оставляем браузеру (новая вкладка и т. п.). */
function isPlainLeftClick(event: MouseEvent): boolean {
  const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  return !event.defaultPrevented && event.button === 0 && !modified
}

/** URL ссылки, по которой кликнули, если её можно открыть роутером; иначе null. */
function internalLinkUrl(target: EventTarget | null): URL | null {
  const link = (target as Element | null)?.closest('a')
  if (!link || link.target || link.hasAttribute('download')) return null

  const url = new URL(link.href, location.href)
  // Другой сайт — обычный переход; та же страница (якорь) — прокрутка браузером
  if (url.origin !== location.origin || url.pathname === location.pathname) return null
  return url
}
