// Линтер: рекомендуемые правила JS, TypeScript (с проверкой типов) и Svelte, правила безопасности
// и проверка сложности.
// Правила оформления отключены (eslint-config-prettier) — за оформление отвечает Prettier
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import security from 'eslint-plugin-security'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import ts from 'typescript-eslint'
import { complexity, parsers } from './eslint.complexity.config.js'

export default defineConfig(
  js.configs.recommended,
  // С информацией о типах: запрещает незаметно распространять any (no-unsafe-*) и т. п.
  ts.configs.recommendedTypeChecked,
  svelte.configs.recommended,
  // Безопасность: небезопасная запись HTML в DOM (innerHTML, insertAdjacentHTML, document.write)
  noUnsanitized.configs.recommended,
  // Безопасность: eval, опасные регулярные выражения, невидимые символы и т. п.
  security.configs.recommended,
  {
    rules: {
      // Срабатывает на любое obj[key] — слишком много ложных находок
      'security/detect-object-injection': 'off',
    },
  },
  prettier,
  svelte.configs.prettier,
  // После наборов правил: они заново назначают парсеры и перекрыли бы TypeScript
  parsers,
  {
    languageOptions: {
      globals: { ...globals.browser },
      // Типы берутся из tsconfig.json — тот же проект, что проверяет svelte-check
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    // У экспортируемых функций — явные типы параметров и результата (как strict в mypy)
    files: ['**/*.{ts,svelte}'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
  },
  {
    // Конфиги Vite, Vitest, ESLint и Svelte выполняются в Node и не входят в tsconfig.json
    files: ['*.config.{js,ts}'],
    extends: [ts.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
  },
  complexity,
)
