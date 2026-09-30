<script lang="ts">
  import { untrack } from 'svelte'
  import { Tree, type TreeItem, type TreeValue } from 'sv5ui'
  import type { DirNode, TreeNode } from '../lib/api'

  interface Props {
    tree: DirNode
    /** Путь открытой статьи, например `AI/LLM.md`. */
    currentPath: string | null
    onSelect: (path: string) => void
  }

  let { tree, currentPath, onSelect }: Props = $props()

  // Ключи папок с префиксом, чтобы не пересекаться с путями статей
  const DIR_PREFIX = 'dir:'

  function toItems(nodes: TreeNode[]): TreeItem[] {
    return nodes.map((node) =>
      node.type === 'dir'
        ? { label: node.name, value: DIR_PREFIX + node.path, children: toItems(node.children) }
        : { label: node.title, value: node.path, icon: 'lucide:file' },
    )
  }

  const items = $derived(toItems(tree.children))

  let expanded = $state<string[]>([])

  // Раскрыть папки на пути к открытой статье
  $effect(() => {
    if (!currentPath) return
    const parts = currentPath.split('/').slice(0, -1)
    const ancestors = parts.map((_, i) => DIR_PREFIX + parts.slice(0, i + 1).join('/'))
    const current = untrack(() => expanded)
    const missing = ancestors.filter((key) => !current.includes(key))
    if (missing.length) expanded = [...current, ...missing]
  })

  // Выделение управляется маршрутом: клик по статье — переход,
  // клик по папке или повторный клик по статье выделение не меняют
  function getValue(): TreeValue | undefined {
    return currentPath ?? undefined
  }

  function setValue(value: TreeValue | undefined) {
    if (typeof value === 'string' && !value.startsWith(DIR_PREFIX)) onSelect(value)
  }
</script>

<Tree {items} bind:expanded bind:value={getValue, setValue} size="sm" />
