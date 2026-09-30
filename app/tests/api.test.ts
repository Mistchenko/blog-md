import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchArticle, fetchTree } from '../src/lib/api'

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTree', () => {
  it('возвращает дерево', async () => {
    const tree = { type: 'dir', name: '', path: '', children: [] }
    const fetchMock = mockFetch(json(tree))

    await expect(fetchTree()).resolves.toEqual(tree)
    expect(fetchMock).toHaveBeenCalledWith('/api/tree')
  })
})

describe('fetchArticle', () => {
  it('кодирует каждый сегмент пути отдельно', async () => {
    const fetchMock = mockFetch(json({ path: 'a b/c#d.md' }))

    await fetchArticle('a b/c#d.md')
    expect(fetchMock).toHaveBeenCalledWith('/api/articles/a%20b/c%23d.md')
  })

  it('бросает ApiError с detail из ответа', async () => {
    mockFetch(json({ detail: 'Статья не найдена' }, 404))

    const error = await fetchArticle('missing.md').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'Статья не найдена' })
  })

  it('берёт statusText, если detail не строка (ошибка валидации FastAPI)', async () => {
    const response = json({ detail: [{ loc: ['path'], msg: 'invalid' }] }, 422)
    mockFetch(
      new Response(await response.text(), { status: 422, statusText: 'Unprocessable Entity' }),
    )

    await expect(fetchArticle('x.md')).rejects.toMatchObject({
      status: 422,
      message: 'Unprocessable Entity',
    })
  })

  it('берёт statusText, если тело ответа не JSON', async () => {
    mockFetch(new Response('<html>oops</html>', { status: 502, statusText: 'Bad Gateway' }))

    await expect(fetchArticle('x.md')).rejects.toMatchObject({
      status: 502,
      message: 'Bad Gateway',
    })
  })
})
