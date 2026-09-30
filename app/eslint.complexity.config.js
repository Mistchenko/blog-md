// Только цикломатическая сложность: используется `npm run complexity` и входит в eslint.config.js
import svelte from 'eslint-plugin-svelte'
import ts from 'typescript-eslint'

// Сложность функции (McCabe); тот же порог, что у backend (radon)
const MAX_COMPLEXITY = 10

/** Парсеры для .ts и .svelte — нужны любому набору правил. */
export const parsers = [
  { ignores: ['dist/'] },
  ...svelte.configs.base,
  {
    files: ['**/*.ts'],
    languageOptions: { parser: ts.parser },
  },
  {
    // Svelte-парсер разбирает .svelte и модули с рунами, TypeScript внутри — ts.parser
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
]

export const complexity = {
  files: ['**/*.{js,ts,svelte}'],
  rules: { complexity: ['error', MAX_COMPLEXITY] },
}

export default [...parsers, complexity]
