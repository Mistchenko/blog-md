# Блог из файлов Markdown

Учебный проект: блог, где статьи — это обычные `.md` файлы в папке `volumes/data`.
Сохранили файл в редакторе — статья появилась на сайте, без перезапуска и пересборки.

Слева на странице — дерево статей (повторяет структуру папок), справа — выбранная статья.
Авторизации нет, редактирования через UI нет.

## Как это работает

```
Браузер ──► app (Vite, :5173) ──/api──► server (FastAPI, :8000) ──► volumes/data (только чтение)
```

- **server** — Python 3.14 + FastAPI. При каждом запросе читает папку заново и отдаёт
  дерево статей (`GET /api/tree`) и текст статьи (`GET /api/articles/<путь>.md`).
- **app** — Svelte 5 + TypeScript + SV5UI. Рендерит Markdown в браузере, при возврате на
  вкладку перезапрашивает дерево, поэтому новые статьи появляются сами.
- Всё запускается только в Docker: `node_modules` и Python-пакеты живут в образах,
  в рабочих папках проекта их нет.

Подробности — в [spec/SPEC.md](spec/SPEC.md), этапы разработки — в [spec/PLAN.md](spec/PLAN.md).

## Структура

- `app/` — frontend и его тесты (`app/tests`)
- `server/` — backend и его тесты (`server/tests`)
- `docker/` — `compose.yml` и Dockerfile'ы сервисов
- `volumes/data/` — статьи блога
- `spec/` — спецификация и план
- `.githooks/` — git-хуки (проверка кода перед коммитом)

## Как добавить статью

Положите файл в `volumes/data` (можно во вложенную папку):

- имена файлов и папок — только латиница, цифры, `.`, `_`, `-`; расширение — `.md`;
- название статьи в дереве — первая строка файла без `#`;
- `about.md` в корне показывается на главной странице.

Файлы с недопустимым именем в дерево не попадают, причина пишется в лог `server`.

## Запуск

Нужны Docker (с Compose v2) и `make`. Все команды выполняются из корня проекта.
Для каждой команды `make` ниже приведён её эквивалент на `docker compose`.

### Сервис

**Первый запуск и запуск с логами в терминале** — собирает образы и поднимает оба сервиса.
Остановка — `Ctrl+C`.

```sh
make dev
# docker compose -f docker/compose.yml up --build
```

После старта:

- сайт — http://localhost:5173
- API — http://localhost:8000/api/tree, документация API — http://localhost:8000/docs

**Запуск в фоне, логи и остановка:**

```sh
make up        # docker compose -f docker/compose.yml up --build -d
make ps        # docker compose -f docker/compose.yml ps
make logs      # docker compose -f docker/compose.yml logs -f
make down      # docker compose -f docker/compose.yml down
```

Логи одного сервиса: `docker compose -f docker/compose.yml logs -f server` (или `app`).

Код `app/` и `server/` смонтирован в контейнеры: изменения подхватываются сразу
(Vite HMR и `uvicorn --reload`), перезапускать ничего не нужно.

### Тесты и проверки

Команды запускают отдельный временный контейнер, поднятый сервис для них не нужен.

**Всё сразу** — все проверки и тесты backend и frontend одной командой (около 15 секунд):

```sh
make verify
```

По очереди выполняются `format-check`, `lint`, `check`, `coverage` (включает тесты),
`complexity` и `bandit`. Если шаг не прошёл, остальные всё равно выполняются; в конце —
сводка с упавшими шагами, и команда завершается с ошибкой. Каждый шаг описан ниже.

**Тесты:**

```sh
make test          # backend и frontend
make test-server   # backend, pytest:  docker compose -f docker/compose.yml run --rm --no-deps server pytest
make test-app      # frontend, Vitest: docker compose -f docker/compose.yml run --rm --no-deps app npm run test
```

Тесты лежат отдельно от кода: backend — в `server/tests`, frontend — в `app/tests`.
Один файл или отдельные тесты — передайте аргументы тест-раннеру напрямую:

```sh
docker compose -f docker/compose.yml run --rm --no-deps server pytest tests/test_api.py -v
docker compose -f docker/compose.yml run --rm --no-deps server pytest -k title -v
docker compose -f docker/compose.yml run --rm --no-deps app npx vitest run tests/paths.test.ts
docker compose -f docker/compose.yml run --rm --no-deps app npx vitest run -t handleLinkClick
```

**Покрытие кода тестами** — строки и ветки, порог 90%. Если покрытие ниже порога,
команда завершается с ошибкой.

```sh
make coverage          # backend и frontend
make coverage-server   # docker compose -f docker/compose.yml run --rm --no-deps server pytest --cov
make coverage-app      # docker compose -f docker/compose.yml run --rm --no-deps app npm run coverage
```

Что измеряется и где задан порог:

- backend — pytest-cov по коду `server/src/blog`; порог `fail_under` в `server/pyproject.toml`;
- frontend — Vitest с провайдером V8 по коду `app/src/lib`; пороги `thresholds` в `app/vitest.config.ts`.
  Компоненты `.svelte` в замер не входят: их поведение проверяется в браузере.

В отчётах видны номера непокрытых строк (колонки `Missing` и `Uncovered Line #s`).
Файлы с данными и отчётами покрытия пишутся в `/tmp` контейнера, в проекте не появляются.
Покрытие отдельного модуля или набора тестов:

```sh
docker compose -f docker/compose.yml run --rm --no-deps server pytest --cov=blog.content tests/test_content.py
docker compose -f docker/compose.yml run --rm --no-deps app npx vitest run --coverage tests/paths.test.ts
```

**Линтеры** — ruff check для backend, ESLint для frontend:

```sh
make lint          # backend и frontend
make lint-server   # docker compose -f docker/compose.yml run --rm --no-deps server ruff check .
make lint-app      # docker compose -f docker/compose.yml run --rm --no-deps app npm run lint
make lint-fix      # исправить то, что линтеры умеют исправлять сами (файлы изменяются)
```

Правила:

- backend — секция `[tool.ruff.lint]` в `server/pyproject.toml`: pycodestyle, pyflakes, порядок
  импортов, bugbear, pyupgrade, упрощения, стиль pytest и правила ruff. Отключены только
  предупреждения о «похожих» символах — кириллица в строках и комментариях здесь норма;
- frontend — `app/eslint.config.js`: рекомендуемые правила JS, typescript-eslint с проверкой
  типов (`recommendedTypeChecked`) и eslint-plugin-svelte, правила безопасности и проверка сложности. Правила оформления отключены
  (eslint-config-prettier) — за оформление отвечает Prettier. Линтер падает и на предупреждениях
  (`--max-warnings 0`).

Правила безопасности frontend — аналог bandit, работают внутри `make lint-app`:

- eslint-plugin-no-unsanitized — запись непроверенного HTML в DOM: `innerHTML`, `outerHTML`,
  `insertAdjacentHTML`, `document.write`. Для `{@html}` в `.svelte` то же проверяет `svelte/no-at-html-tags`;
- eslint-plugin-security — `eval` с выражением, регулярные выражения из данных и с риском ReDoS,
  невидимые и bidi-символы в коде и т. п. Правило `detect-object-injection` отключено:
  оно срабатывает на любое `obj[key]`.

Отключить правило в конкретном месте можно комментарием с причиной:
`# noqa: E711` в Python, `// eslint-disable-next-line <правило> -- причина` в TypeScript и Svelte.

**Поиск уязвимостей в backend** — [bandit](https://bandit.readthedocs.io/): небезопасные вызовы
(`subprocess` с `shell=True`, `eval`, `pickle`), пароли и ключи в коде, слабая криптография и т. п.
Проверяются код и тесты; при любой находке команда завершается с ошибкой.

```sh
make bandit
# docker compose -f docker/compose.yml run --rm --no-deps server bandit -c pyproject.toml -q -r src tests
```

Настройки — секция `[tool.bandit]` в `server/pyproject.toml`. В тестах отключено только
правило B101 (`assert`): для pytest это штатный способ проверки. Если находка ложная,
строку можно пометить комментарием `# nosec B<номер>` с пояснением.

**Форматирование кода** — ruff format для backend, Prettier для frontend:

```sh
make format                # отформатировать backend и frontend (файлы изменяются)
make format-server         # docker compose -f docker/compose.yml run --rm --no-deps server ruff format .
make format-app            # docker compose -f docker/compose.yml run --rm --no-deps app npm run format
```

Проверка без изменения файлов: если что-то нужно отформатировать, команда показывает это
и завершается с ошибкой.

```sh
make format-check          # backend и frontend
make format-check-server   # docker compose -f docker/compose.yml run --rm --no-deps server ruff format --check --diff .
make format-check-app      # docker compose -f docker/compose.yml run --rm --no-deps app npm run format:check
```

Настройки:

- backend — секция `[tool.ruff]` в `server/pyproject.toml`: строка до 100 символов, двойные кавычки;
- frontend — `app/.prettierrc.json`: строка до 100 символов, без `;`, одинарные кавычки,
  запятая после последнего элемента; `.svelte` форматируются плагином prettier-plugin-svelte,
  исключения — в `app/.prettierignore`.

**Проверка типов** — mypy для backend, svelte-check для frontend:

```sh
make check          # backend и frontend
make check-server   # docker compose -f docker/compose.yml run --rm --no-deps server mypy
make check-app      # docker compose -f docker/compose.yml run --rm --no-deps app npm run check
```

mypy работает в строгом режиме (секция `[tool.mypy]` в `server/pyproject.toml`) и проверяет
код и тесты: у каждой функции должны быть аннотации всех параметров и возвращаемого
значения, неявный `Any` запрещён. Для моделей Pydantic подключён плагин `pydantic.mypy`.

Для frontend типы проверяет TypeScript (`"strict": true` в `app/tsconfig.json`). То, что
в mypy даёт строгий режим, во frontend проверяет линтер (`make lint-app`):

- `explicit-module-boundary-types` — у экспортируемых функций явные типы параметров и результата;
  внутренние функции и колбэки остаются с выводом типов;
- `recommendedTypeChecked` — значение типа `any` нельзя незаметно присвоить, вернуть или
  обратиться к его полям (`no-unsafe-*`), промис нельзя «забыть» без `await` или явного `void`.

**Цикломатическая сложность** — у каждой функции не больше 10. Если порог превышен, команда
завершается с ошибкой и показывает, какие функции его превысили.

```sh
make complexity           # backend и frontend
make complexity-server    # только backend
make complexity-app       # только frontend
```

Что выполняется внутри:

- backend — [radon](https://radon.readthedocs.io/):
  `docker compose -f docker/compose.yml run --rm --no-deps server radon cc src -n C -s`
  выводит функции ранга C и хуже, т. е. со сложностью больше 10. У radon нет режима проверки
  с кодом ошибки, поэтому `make complexity-server` считает непустой вывод провалом;
- frontend — ESLint только с правилом `complexity` (`app/eslint.complexity.config.js`):
  `docker compose -f docker/compose.yml run --rm --no-deps app npm run complexity`.
  Считаются функции в `.ts` и в `<script>` компонентов `.svelte`; логика шаблонов (`{#if}`, `{#each}`) не учитывается.

**Отчёт по сложности** показывает сложность каждой функции, ничего не проверяет и завершается без ошибки:

```sh
make complexity-report
# docker compose -f docker/compose.yml run --rm --no-deps server radon cc src -s -a
# docker compose -f docker/compose.yml run --rm --no-deps app npm run complexity:report
```

В отчёте frontend перечислены функции со сложностью от 2, в отчёте backend — все функции с рангом и средним значением.

### Проверка перед коммитом

Git-хук `.githooks/pre-commit` перед каждым коммитом проверяет форматирование, линтеры и типы
(`format-check`, `lint`, `check`) — только для той части, файлы которой есть в коммите:
`server/` — проверки backend, `app/` — проверки frontend. Коммит из одних статей, спецификации
или README проходит без проверок. Одна часть проверяется примерно за 5 секунд; нужен запущенный Docker.

Git не включает хуки из репозитория сам, поэтому после клонирования один раз выполните:

```sh
make hooks
# git config core.hooksPath .githooks
```

Если проверка не прошла, коммит останавливается. Исправить: `make format` и `make lint-fix`,
остальное — вручную. Пропустить проверку разово: `git commit --no-verify`.

Проверяются файлы на диске, а не только то, что добавлено в коммит: при частичном добавлении
(`git add -p`) в проверку попадут и незакоммиченные правки этих файлов.

### Зависимости

Зависимости устанавливаются при сборке образа, поэтому после их изменения образ нужно
пересобрать.

**npm-пакет** — обновляет `package.json` и `package-lock.json` и пересобирает образ `app`:

```sh
make app-add PKG=имя-пакета          # в dependencies
make app-add PKG=имя-пакета DEV=1    # в devDependencies
```

**Python-пакет** — добавьте его в `server/pyproject.toml` (`dependencies` или
`[project.optional-dependencies].dev`) и пересоберите образы:

```sh
make build     # docker compose -f docker/compose.yml build
make up
```
