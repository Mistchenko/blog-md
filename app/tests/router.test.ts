import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handleLinkClick, router } from '../src/lib/router.svelte'
import { page } from '../src/lib/sveltekit-state'

function resetLocation(url = '/') {
  history.replaceState(null, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Клик по элементу; возвращает, отменил ли переход handleLinkClick.
 * Затем переход отменяется в любом случае: jsdom не умеет переходить между документами.
 */
function click(target: Element, init: MouseEventInit = {}): boolean {
  let intercepted = false
  const record = (event: Event) => {
    intercepted = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', record)
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }),
  )
  window.removeEventListener('click', record)
  return intercepted
}

/** Клик по элементу внутри ссылки с атрибутами attrs. */
function clickLink(attrs: Record<string, string>, init: MouseEventInit = {}): boolean {
  const link = document.createElement('a')
  for (const [name, value] of Object.entries(attrs)) link.setAttribute(name, value)
  const inner = document.createElement('span')
  link.append(inner)
  document.body.replaceChildren(link)
  return click(inner, init)
}

// Как в App.svelte: обработчик на window, до него доходят все всплывающие клики
beforeAll(() => window.addEventListener('click', handleLinkClick))
afterAll(() => window.removeEventListener('click', handleLinkClick))

beforeEach(() => {
  resetLocation('/')
})

describe('router.route', () => {
  it('главная показывает about.md', () => {
    expect(router.route).toEqual({ name: 'home', articlePath: 'about.md' })
  })

  it('адрес статьи', () => {
    router.navigate('/article/AI/LLM')
    expect(router.route).toEqual({ name: 'article', articlePath: 'AI/LLM.md' })
  })

  it('неизвестный адрес', () => {
    router.navigate('/something')
    expect(router.route).toEqual({ name: 'not-found' })
  })
})

describe('router.navigate', () => {
  it('добавляет запись в историю', () => {
    const length = history.length
    router.navigate('/article/AI/LLM#раздел')

    expect(location.pathname).toBe('/article/AI/LLM')
    expect(decodeURIComponent(location.hash)).toBe('#раздел')
    expect(history.length).toBe(length + 1)
  })

  it('не дублирует запись для текущего адреса', () => {
    router.navigate('/article/AI/LLM')
    const length = history.length
    router.navigate('/article/AI/LLM')

    expect(history.length).toBe(length)
  })

  it('следует за «назад/вперёд» (popstate)', () => {
    router.navigate('/article/AI/LLM')
    resetLocation('/article/Python/async')

    expect(router.pathname).toBe('/article/Python/async')
  })
})

describe('handleLinkClick', () => {
  it('открывает внутреннюю ссылку роутером', () => {
    expect(clickLink({ href: '/article/AI/LLM#x' })).toBe(true)
    expect(router.pathname).toBe('/article/AI/LLM')
    expect(location.hash).toBe('#x')
  })

  it.each([
    ['Cmd', { metaKey: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['средняя кнопка', { button: 1 }],
  ])('оставляет браузеру клик с модификатором: %s', (_, init) => {
    expect(clickLink({ href: '/article/AI/LLM' }, init)).toBe(false)
    expect(router.pathname).toBe('/')
  })

  it.each([
    ['другой сайт', { href: 'https://example.com/article/x' }],
    ['target', { href: '/article/AI/LLM', target: '_blank' }],
    ['download', { href: '/article/AI/LLM', download: '' }],
    ['якорь на той же странице', { href: '/#section' }],
  ])('не перехватывает: %s', (_, attrs) => {
    expect(clickLink(attrs)).toBe(false)
    expect(router.pathname).toBe('/')
  })

  it('не перехватывает клик мимо ссылки', () => {
    const paragraph = document.createElement('p')
    document.body.replaceChildren(paragraph)

    expect(click(paragraph)).toBe(false)
  })

  it('пропускает событие, уже обработанное другим обработчиком', () => {
    const link = document.createElement('a')
    link.href = '/article/AI/LLM'
    link.addEventListener('click', (event) => event.preventDefault())
    document.body.replaceChildren(link)
    click(link)

    expect(router.pathname).toBe('/')
  })
})

describe('замена $app/state', () => {
  it('page.url отражает текущий адрес', () => {
    router.navigate('/article/AI/LLM#x')

    expect(page.url.pathname).toBe('/article/AI/LLM')
    expect(page.url.hash).toBe('#x')
  })
})
