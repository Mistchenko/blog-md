import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        // Логика приложения; компоненты .svelte проверяются сценариями в браузере
        include: ['src/lib/**/*.ts'],
        reporter: ['text'],
        // Отчёт вне смонтированной директории, чтобы не мусорить на хосте
        reportsDirectory: '/tmp/coverage',
        thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  }),
)
