const ARTICLE_PREFIX = '/article/'
const ARTICLE_SUFFIX = '.md'

/** Ссылка со схемой (`https:`, `mailto:`), протокол-относительная (`//host`) или якорь. */
const NOT_RELATIVE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

/** Статья, которая показывается на главной странице. */
export const HOME_ARTICLE = 'about.md'

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/** `AI/LLM.md` → `/article/AI/LLM` */
export function articleUrl(path: string): string {
  return ARTICLE_PREFIX + path.slice(0, -ARTICLE_SUFFIX.length)
}

/** `/article/AI/LLM` → `AI/LLM.md`; null, если это не адрес статьи. */
export function articlePathFromUrl(pathname: string): string | null {
  if (!pathname.startsWith(ARTICLE_PREFIX)) return null
  const rest = safeDecode(pathname.slice(ARTICLE_PREFIX.length))?.replace(/\/+$/, '')
  return rest ? rest + ARTICLE_SUFFIX : null
}

/**
 * Переписывает относительную ссылку на `.md` из статьи `currentPath` в маршрут SPA.
 * `../Python/async.md#раздел` из `AI/LLM.md` → `/article/Python/async#раздел`.
 * Возвращает null для внешних ссылок, якорей, не-`.md` и ссылок за корень хранилища.
 */
export function resolveArticleLink(href: string, currentPath: string): string | null {
  if (NOT_RELATIVE_RE.test(href)) return null

  const [pathPart, hash] = splitHash(href)
  if (!pathPart.endsWith(ARTICLE_SUFFIX)) return null

  const base = pathPart.startsWith('/') ? [] : currentPath.split('/').slice(0, -1)
  const segments = resolveSegments(base, pathPart)
  return segments?.length ? articleUrl(segments.join('/')) + hash : null
}

function splitHash(href: string): [path: string, hash: string] {
  const index = href.indexOf('#')
  return index === -1 ? [href, ''] : [href.slice(0, index), href.slice(index)]
}

/** Применяет сегменты пути к base; null — выход за корень хранилища или битый %-escape. */
function resolveSegments(base: string[], path: string): string[] | null {
  const segments = [...base]
  for (const raw of path.split('/')) {
    if (raw === '' || raw === '.') continue
    if (raw === '..') {
      if (segments.pop() === undefined) return null
      continue
    }
    const segment = safeDecode(raw)
    if (segment === null) return null
    segments.push(segment)
  }
  return segments
}
