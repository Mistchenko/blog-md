import { describe, expect, it } from 'vitest'
import { articlePathFromUrl, articleUrl, resolveArticleLink } from '../src/lib/paths'

describe('articleUrl', () => {
  it('убирает .md и добавляет префикс', () => {
    expect(articleUrl('AI/LLM.md')).toBe('/article/AI/LLM')
    expect(articleUrl('about.md')).toBe('/article/about')
  })
})

describe('articlePathFromUrl', () => {
  it.each([
    ['/article/AI/LLM', 'AI/LLM.md'],
    ['/article/about', 'about.md'],
    ['/article/AI/LLM/', 'AI/LLM.md'],
    ['/article/a%20b', 'a b.md'],
  ])('%s → %s', (url, path) => {
    expect(articlePathFromUrl(url)).toBe(path)
  })

  it.each(['/', '/about', '/articles/x', '/article/', '/article/%E0%A4%A'])(
    '%s — не статья',
    (url) => {
      expect(articlePathFromUrl(url)).toBeNull()
    },
  )
})

describe('resolveArticleLink', () => {
  it.each([
    ['../Python/async.md#раздел', 'AI/LLM.md', '/article/Python/async#раздел'],
    ['Diffusion.md', 'AI/LLM.md', '/article/AI/Diffusion'],
    ['./Diffusion.md', 'AI/LLM.md', '/article/AI/Diffusion'],
    ['/Python/venv.md', 'AI/LLM.md', '/article/Python/venv'],
    ['Python/async.md#event-loop', 'about.md', '/article/Python/async#event-loop'],
    ['a%20b.md', 'about.md', '/article/a b'],
  ])('%s из %s → %s', (href, current, expected) => {
    expect(resolveArticleLink(href, current)).toBe(expected)
  })

  it.each([
    ['../../x.md', 'AI/LLM.md'],
    ['../x.md', 'about.md'],
    ['https://example.com/a.md', 'about.md'],
    ['mailto:a@b.c', 'about.md'],
    ['//host/a.md', 'about.md'],
    ['#section', 'about.md'],
    ['image.png', 'about.md'],
    ['%E0%A4%A.md', 'about.md'],
    ['/', 'about.md'],
  ])('%s из %s — не переписывается', (href, current) => {
    expect(resolveArticleLink(href, current)).toBeNull()
  })
})
