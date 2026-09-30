# Этапы разработки

Спецификация — [SPEC.md](SPEC.md).

## Этап 1. Docker-окружение и каркасы

- [x] `docker/compose.yml`: сервисы `server` и `app`, монтирование кода и `volumes/data:/data:ro`, healthcheck
- [x] `docker/server.Dockerfile`: python:3.14-slim + uv, зависимости в системный Python
- [x] `docker/app.Dockerfile`: node LTS, `node_modules` в `/opt/node_modules`
- [x] `Makefile`: `dev`, `down`, `logs`, `test`, `check`, `app-add`, `build`
- [x] каркас `server` (FastAPI + `/api/health`) и `app` (Vite + Svelte + TS + SV5UI)
- [x] проверка: `make dev` поднимает оба сервиса, на хосте нет `node_modules`/`venv`/`__pycache__`

## Этап 2. Backend

- [x] `config.py` — `DATA_DIR` из env
- [x] `content.py` — правило имён, обход дерева, заголовок из первой строки, чтение статьи, защита путей
- [x] `schemas.py`, `api.py` — `/api/tree`, `/api/articles/{path}`
- [x] тесты: дерево, сортировка, пустые папки, заголовки, недопустимые имена, path traversal, 400/404

## Этап 3. Frontend

- [x] API-клиент и типы
- [x] роутер на History API (`/`, `/article/<путь>`)
- [x] раскладка: sidebar с `Tree`, область статьи, `Drawer` на узких экранах, переключатель темы
- [x] рендер статьи: markdown-it + DOMPurify + highlight.js + `prose`
- [x] переписывание ссылок на `.md` в маршруты SPA
- [x] главная: `about.md` или заглушка
- [x] перезапрос дерева и статьи при возврате на вкладку
- [x] `svelte-check` без ошибок

## Этап 4. Проверка и документация

- [x] переименовать `volumes/data/about.py` → `about.md`
- [x] проверка пользовательских историй в headless-браузере (Playwright в контейнере): новый файл появляется в дереве, клик открывает статью
- [x] README: как запустить, команды Makefile, правило имён

## Этап 5. Контроль цикломатической сложности

- [x] backend: radon в dev-зависимостях, порог — сложность не выше 10 на функцию (ранг C и хуже — провал)
- [x] frontend: ESLint (typescript-eslint, eslint-plugin-svelte) только с правилом `complexity: 10`
- [x] рефакторинг функций выше порога: `_scan_dir` (16 → 9), `resolveArticleLink` (15 → 6), `handleLinkClick` (13 → 3)
- [x] `Makefile`: `complexity`, `complexity-server`, `complexity-app`, `complexity-report`
- [x] README: команды запуска

## Этап 6. Покрытие кода тестами

- [x] backend: pytest-cov, покрытие строк и веток, порог `fail_under = 90`, данные покрытия в `/tmp` контейнера
- [x] тесты на ошибки файловой системы (нечитаемая папка и файл) и на `create_app` — покрытие 94% → 100%
- [x] frontend: Vitest + jsdom, тесты в `app/tests` на `paths`, `markdown`, `api`, `router`, замену `$app/state`; покрытие V8, пороги 90%
- [x] упрощено правило `link_open` в `markdown.ts`: у markdown-it нет своего, запасной вариант не нужен
- [x] `Makefile`: `test` / `test-server` / `test-app`, `coverage` / `coverage-server` / `coverage-app`
- [x] README: команды запуска

## Этап 7. Форматирование кода

- [x] backend: ruff format, строка до 100 символов, кэш ruff в `/tmp` контейнера
- [x] frontend: Prettier + prettier-plugin-svelte, настройки под текущий стиль кода
- [x] весь код отформатирован: 1 файл backend, 6 файлов frontend
- [x] `Makefile`: `format` / `format-server` / `format-app`, `format-check` / `format-check-server` / `format-check-app`
- [x] README: команды запуска

## Этап 8. Линтеры

- [x] backend: ruff check, наборы правил E, W, F, I, B, UP, SIM, C4, PT, RUF
- [x] frontend: ESLint — рекомендуемые правила @eslint/js, typescript-eslint, eslint-plugin-svelte, eslint-config-prettier
- [x] проверка сложности вынесена в `app/eslint.complexity.config.js` и подключается в конфиг линтера
- [x] исправлены замечания: составные `assert` в тестах разбиты на отдельные; `{@html}` отключён точечно с причиной
- [x] `Makefile`: `lint` / `lint-server` / `lint-app`, `lint-fix`
- [x] README: команды запуска

## Этап 9. Поиск уязвимостей (bandit)

- [x] backend: bandit в dev-зависимостях, проверяются `src` и `tests`
- [x] в тестах отключено только B101 (`assert` — штатный способ проверки pytest), остальные правила действуют
- [x] находок в коде нет
- [x] `Makefile`: `bandit`
- [x] README: команда запуска

## Этап 10. Поиск уязвимостей во frontend

- [x] ESLint: eslint-plugin-no-unsanitized и eslint-plugin-security (без `detect-object-injection`)
- [x] `lint` падает и на предупреждениях (`--max-warnings 0`) — правила security выдают warning
- [x] исправлена находка: в тесте `innerHTML` заменён на `DOMParser`
- [x] README: какие правила и где работают

## Этап 11. Проверка типов backend (mypy)

- [x] mypy в строгом режиме (`strict = true`) по `src` и `tests`, плагин `pydantic.mypy`, кэш в `/tmp` контейнера
- [x] `src`: одно замечание — `request.app.state` в Starlette не типизирован, тип задан явно
- [x] `tests`: аннотированы все тесты, фикстуры и вспомогательные функции; вынесен `skipped_paths`
- [x] `Makefile`: `check` / `check-server` / `check-app`
- [x] README: команды запуска

## Этап 12. Строгая типизация frontend

- [x] ESLint: `recommendedTypeChecked` (типы из `tsconfig.json` через `projectService`), для `*.config.*` — без проверки типов
- [x] `explicit-module-boundary-types`: явные типы у экспортируемых функций
- [x] исправлено: «забытые» промисы в `App.svelte` помечены `void`; разбор ошибки API без `any`;
      `currentPath` в `markdown.ts` проверяется как строка; тип результата у `handleLinkClick`
- [x] тест: `detail` не строкой (ошибка валидации FastAPI 422) — берётся статус HTTP
- [x] README: что и где проверяется

## Этап 13. Проверка перед коммитом

- [x] `.githooks/pre-commit`: `format-check`, `lint`, `check` для затронутой части — `server/`, `app/` или ничего
- [x] `Makefile`: `hooks` — `git config core.hooksPath .githooks`
- [x] проверено на временном индексе git: коммит документации — без проверок, чистый код — проходит,
      неотформатированный — коммит останавливается
- [x] README: подключение хука, как исправить и как пропустить

## Этап 14. Общая команда проверок

- [x] `make verify`: `format-check`, `lint`, `check`, `coverage` (с тестами), `complexity`, `bandit`
- [x] при ошибке остальные шаги выполняются, в конце — сводка упавших и код ошибки
- [x] README: описание команды
