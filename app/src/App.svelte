<script lang="ts">
  import { onMount, tick, untrack } from 'svelte'
  import { Button, Drawer, Empty, Skeleton, ThemeMode, ThemeModeButton } from 'sv5ui'
  import ArticleTree from './components/ArticleTree.svelte'
  import ArticleView from './components/ArticleView.svelte'
  import { ApiError, fetchArticle, fetchTree, type Article, type DirNode } from './lib/api'
  import { articleUrl } from './lib/paths'
  import { handleLinkClick, router } from './lib/router.svelte'

  type ArticleState = 'loading' | 'ready' | 'not-found' | 'error'

  let tree = $state<DirNode | null>(null)
  let treeError = $state(false)
  let article = $state<Article | null>(null)
  let articleState = $state<ArticleState>('loading')
  let drawerOpen = $state(false)
  let main: HTMLElement

  const route = $derived(router.route)
  const currentPath = $derived(route.name === 'not-found' ? null : route.articlePath)

  async function loadTree() {
    try {
      tree = await fetchTree()
      treeError = false
    } catch {
      treeError = true
    }
  }

  let articleRequest = 0

  /** silent — фоновое обновление без индикатора загрузки. */
  async function loadArticle(path: string, silent = false) {
    const request = ++articleRequest
    if (!silent) articleState = 'loading'
    try {
      const loaded = await fetchArticle(path)
      if (request !== articleRequest) return
      article = loaded
      articleState = 'ready'
    } catch (error) {
      if (request !== articleRequest) return
      article = null
      articleState = error instanceof ApiError && error.status === 404 ? 'not-found' : 'error'
    }
    if (!silent) await scrollToTarget()
  }

  /** После перехода: к якорю из адреса или в начало статьи. */
  async function scrollToTarget() {
    await tick()
    const id = decodeURIComponent(location.hash.slice(1))
    const target = id ? document.getElementById(id) : null
    if (target) target.scrollIntoView()
    else main?.scrollTo({ top: 0 })
  }

  $effect(() => {
    const path = currentPath
    untrack(() => {
      drawerOpen = false
      // Ошибки загрузки обрабатываются внутри; ждать результат не нужно
      if (path) void loadArticle(path)
    })
  })

  $effect(() => {
    document.title = article && articleState === 'ready' ? `${article.title} — Блог` : 'Блог'
  })

  onMount(() => {
    void loadTree()
    // Новые и изменённые статьи подтягиваются при возврате на вкладку или в окно.
    // visibilitychange и focus часто приходят парой — второй вызов пропускаем
    let lastRefresh = 0
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 1000) return
      lastRefresh = Date.now()
      void loadTree()
      if (currentPath) void loadArticle(currentPath, true)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  })

  function openArticle(path: string) {
    router.navigate(articleUrl(path))
  }
</script>

<svelte:window onclick={handleLinkClick} />

<ThemeMode />

{#snippet treePanel()}
  {#if tree}
    {#if tree.children.length}
      <ArticleTree {tree} {currentPath} onSelect={openArticle} />
    {:else}
      <p class="px-3 py-2 text-sm text-on-surface-variant">Статей пока нет</p>
    {/if}
  {:else if treeError}
    <div class="px-3 py-2 text-sm">
      <p class="text-error">Не удалось загрузить список статей</p>
      <Button class="mt-2" size="sm" variant="outline" label="Повторить" onclick={loadTree} />
    </div>
  {:else}
    <div class="space-y-2 p-2">
      {#each { length: 6 }, i (i)}
        <Skeleton class="h-5 w-full" />
      {/each}
    </div>
  {/if}
{/snippet}

<div class="flex h-dvh flex-col">
  <header
    class="flex h-14 shrink-0 items-center gap-2 border-b border-outline-variant px-3 md:px-4"
  >
    <div class="md:hidden">
      <Drawer bind:open={drawerOpen} direction="left" title="Статьи">
        {#snippet children({ props })}
          <Button
            {...props}
            icon="lucide:menu"
            variant="ghost"
            color="surface"
            aria-label="Статьи"
          />
        {/snippet}
        {#snippet body()}
          {@render treePanel()}
        {/snippet}
      </Drawer>
    </div>
    <a href="/" class="text-lg font-semibold">Блог</a>
    <div class="ml-auto">
      <ThemeModeButton aria-label="Сменить тему" />
    </div>
  </header>

  <div class="flex min-h-0 flex-1">
    <aside
      class="hidden w-72 shrink-0 overflow-y-auto border-r border-outline-variant p-2 md:block"
    >
      {@render treePanel()}
    </aside>

    <main bind:this={main} class="min-w-0 flex-1 overflow-y-auto">
      {#if route.name === 'not-found'}
        <Empty class="mt-16" icon="lucide:file" title="Страница не найдена" />
      {:else if articleState === 'loading'}
        <div class="mx-auto max-w-3xl space-y-4 px-4 py-8 md:px-8">
          <Skeleton class="h-9 w-2/3" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-5/6" />
        </div>
      {:else if articleState === 'ready' && article}
        <ArticleView {article} />
      {:else if articleState === 'not-found' && route.name === 'home'}
        <Empty
          class="mt-16"
          icon="lucide:file"
          title="Выберите статью"
          description="Список статей — слева"
        />
      {:else if articleState === 'not-found'}
        <Empty
          class="mt-16"
          icon="lucide:file"
          title="Статья не найдена"
          description="Возможно, файл переименовали или удалили"
        />
      {:else}
        <Empty
          class="mt-16"
          icon="lucide:file"
          title="Не удалось загрузить статью"
          description="Проверьте, что сервер запущен"
        />
      {/if}
    </main>
  </div>
</div>
