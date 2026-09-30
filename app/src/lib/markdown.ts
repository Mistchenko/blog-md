import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import MarkdownIt from 'markdown-it'
import { resolveArticleLink } from './paths'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    }
    return ''
  },
})

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

// id у заголовков, чтобы работали ссылки вида `article.md#раздел`
md.core.ruler.push('heading_ids', (state) => {
  const used = new Map<string, number>()
  state.tokens.forEach((token, i) => {
    if (token.type !== 'heading_open') return
    const text = (state.tokens[i + 1].children ?? [])
      .filter((t) => t.type === 'text' || t.type === 'code_inline')
      .map((t) => t.content)
      .join('')
    const base = slugify(text) || 'section'
    const count = used.get(base) ?? 0
    used.set(base, count + 1)
    token.attrSet('id', count ? `${base}-${count}` : base)
  })
})

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = String(token.attrGet('href') ?? '')
  const currentPath: unknown = env?.currentPath
  const internal = resolveArticleLink(href, typeof currentPath === 'string' ? currentPath : '')
  if (internal) {
    token.attrSet('href', internal)
  } else if (/^https?:\/\//i.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  // Своего правила link_open у markdown-it нет — тег рендерится стандартно
  return self.renderToken(tokens, idx, options)
}

/** Markdown статьи `currentPath` → безопасный HTML. */
export function renderMarkdown(content: string, currentPath: string): string {
  return DOMPurify.sanitize(md.render(content, { currentPath }), { ADD_ATTR: ['target'] })
}
