<script lang="ts">
  import type { Article } from '../lib/api'
  import { renderMarkdown } from '../lib/markdown'

  let { article }: { article: Article } = $props()

  const html = $derived(renderMarkdown(article.content, article.path))
  const updated = $derived(
    new Date(article.updated_at).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' }),
  )
</script>

<article class="mx-auto max-w-3xl px-4 py-8 md:px-8">
  <div class="prose max-w-none dark:prose-invert">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- HTML очищен DOMPurify в renderMarkdown -->
    {@html html}
  </div>
  <footer class="mt-12 border-t border-outline-variant pt-4 text-sm text-on-surface-variant">
    Обновлено: {updated}
  </footer>
</article>
