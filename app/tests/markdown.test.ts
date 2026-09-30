import { describe, expect, it } from 'vitest'
import { renderMarkdown, slugify } from '../src/lib/markdown'

/** HTML статьи как DOM; DOMParser не исполняет скрипты и не пишет в документ. */
function render(content: string, currentPath = 'AI/LLM.md'): HTMLElement {
  const html = renderMarkdown(content, currentPath)
  return new DOMParser().parseFromString(html, 'text/html').body
}

describe('slugify', () => {
  it.each([
    ['Event Loop', 'event-loop'],
    ['1. Введение', '1-введение'],
    ['  Что такое `asyncio`?  ', 'что-такое-asyncio'],
    ['snake_case и kebab-case', 'snake_case-и-kebab-case'],
  ])('%s → %s', (text, slug) => {
    expect(slugify(text)).toBe(slug)
  })
})

describe('renderMarkdown', () => {
  it('даёт заголовкам уникальные id', () => {
    const root = render('# Введение\n\n## Пример\n\n## Пример\n\n## `code` в заголовке\n\n## ???')
    const ids = [...root.querySelectorAll('h1, h2')].map((h) => h.id)
    expect(ids).toEqual(['введение', 'пример', 'пример-1', 'code-в-заголовке', 'section'])
  })

  it('переписывает относительные ссылки на статьи в маршруты', () => {
    const link = render('[async](../Python/async.md#event-loop)').querySelector('a')!
    expect(link.getAttribute('href')).toBe('/article/Python/async#event-loop')
    expect(link.hasAttribute('target')).toBe(false)
  })

  it('открывает внешние ссылки в новой вкладке', () => {
    const link = render('[сайт](https://example.com)').querySelector('a')!
    expect(link.getAttribute('href')).toBe('https://example.com')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('не трогает якоря и прочие ссылки', () => {
    const [anchor, image] = render('[к разделу](#пример) [картинка](img.png)').querySelectorAll('a')
    // markdown-it кодирует не-ASCII в href; браузер декодирует фрагмент при поиске id
    expect(decodeURIComponent(anchor.getAttribute('href')!)).toBe('#пример')
    expect(image.getAttribute('href')).toBe('img.png')
    expect(image.hasAttribute('target')).toBe(false)
  })

  it('подсвечивает код известного языка', () => {
    const code = render('```python\nasync def main():\n    pass\n```').querySelector('pre code')!
    expect(code.querySelector('.hljs-keyword')).not.toBeNull()
  })

  it('экранирует код неизвестного языка без подсветки', () => {
    const code = render('```nosuchlang\n<b>x</b>\n```').querySelector('pre code')!
    expect(code.textContent).toBe('<b>x</b>\n')
    expect(code.querySelector('b, span')).toBeNull()
  })

  it('вырезает опасный HTML', () => {
    const root = render(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[x](javascript:alert(1))',
    )
    expect(root.querySelector('script')).toBeNull()
    expect(root.querySelector('img')!.hasAttribute('onerror')).toBe(false)
    // markdown-it не делает ссылку из javascript: — остаётся текст
    expect(root.querySelector('a')).toBeNull()
  })
})
