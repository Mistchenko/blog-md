export interface ArticleNode {
  type: 'article'
  name: string
  path: string
  title: string
  updated_at: string
}

export interface DirNode {
  type: 'dir'
  name: string
  path: string
  children: TreeNode[]
}

export type TreeNode = DirNode | ArticleNode

export interface Article {
  path: string
  title: string
  content: string
  updated_at: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
  // Форма ответа задана API сервера (схемы Pydantic), во время выполнения не проверяется
  return (await response.json()) as T
}

/** Текст ошибки: `detail` из ответа FastAPI или статус HTTP, если тело не такое. */
async function errorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  const detail = typeof body === 'object' && body !== null && 'detail' in body ? body.detail : null
  return typeof detail === 'string' ? detail : response.statusText
}

export function fetchTree(): Promise<DirNode> {
  return getJson('/api/tree')
}

export function fetchArticle(path: string): Promise<Article> {
  return getJson(`/api/articles/${path.split('/').map(encodeURIComponent).join('/')}`)
}
