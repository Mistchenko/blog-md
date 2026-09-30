COMPOSE := docker compose -f docker/compose.yml

.PHONY: hooks dev up down build logs test test-server test-app coverage coverage-server coverage-app check check-server check-app lint lint-server lint-app lint-fix bandit format format-server format-app format-check format-check-server format-check-app complexity complexity-server complexity-app complexity-report app-add ps

dev: ## Собрать образы и запустить сервисы с логами в терминале
	$(COMPOSE) up --build

up: ## Запустить сервисы в фоне
	$(COMPOSE) up --build -d

down: ## Остановить сервисы
	$(COMPOSE) down

build: ## Пересобрать образы (после изменения зависимостей)
	$(COMPOSE) build

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

test: test-server test-app ## Тесты backend и frontend

test-server: ## Тесты backend (pytest)
	$(COMPOSE) run --rm --no-deps server pytest

test-app: ## Тесты frontend (Vitest)
	$(COMPOSE) run --rm --no-deps app npm run -s test

coverage: coverage-server coverage-app ## Покрытие тестами backend и frontend; ошибка, если ниже порога

coverage-server: ## Покрытие backend (pytest-cov, порог fail_under в server/pyproject.toml)
	$(COMPOSE) run --rm --no-deps server pytest --cov

coverage-app: ## Покрытие frontend (Vitest + V8, пороги в app/vitest.config.ts)
	$(COMPOSE) run --rm --no-deps app npm run -s coverage

check: check-server check-app ## Проверка типов backend и frontend

check-server: ## Проверка типов backend (mypy, строгий режим: все функции с аннотациями)
	$(COMPOSE) run --rm --no-deps server mypy

check-app: ## Проверка типов frontend (svelte-check)
	$(COMPOSE) run --rm --no-deps app npm run -s check

lint: lint-server lint-app ## Линтеры backend и frontend

lint-server: ## Линтер backend (ruff check)
	$(COMPOSE) run --rm --no-deps server ruff check .

lint-app: ## Линтер frontend (ESLint)
	$(COMPOSE) run --rm --no-deps app npm run -s lint

lint-fix: ## Исправить автоматически исправимые замечания линтеров
	$(COMPOSE) run --rm --no-deps server ruff check --fix .
	$(COMPOSE) run --rm --no-deps app npm run -s lint:fix

bandit: ## Поиск уязвимостей в коде и тестах backend (bandit)
	$(COMPOSE) run --rm --no-deps server bandit -c pyproject.toml -q -r src tests

format: format-server format-app ## Отформатировать код backend и frontend

format-server: ## Отформатировать backend (ruff format)
	$(COMPOSE) run --rm --no-deps server ruff format .

format-app: ## Отформатировать frontend (Prettier)
	$(COMPOSE) run --rm --no-deps app npm run -s format

format-check: format-check-server format-check-app ## Проверить форматирование без изменений; ошибка, если нужно форматировать

format-check-server: ## Проверить форматирование backend
	$(COMPOSE) run --rm --no-deps server ruff format --check --diff .

format-check-app: ## Проверить форматирование frontend
	$(COMPOSE) run --rm --no-deps app npm run -s format:check

complexity: complexity-server complexity-app ## Цикломатическая сложность: не больше 10 на функцию

complexity-server: ## Сложность backend (radon: ранг C и хуже — сложность выше 10)
	@out=$$($(COMPOSE) run --rm --no-deps -T server radon cc src -n C -s) || exit 1; \
	if [ -n "$$out" ]; then echo "$$out"; echo "Цикломатическая сложность выше 10"; exit 1; fi; \
	echo "backend: сложность всех функций не выше 10"

complexity-app: ## Сложность frontend (ESLint, правило complexity)
	$(COMPOSE) run --rm --no-deps app npm run -s complexity

complexity-report: ## Отчёт: сложность каждой функции backend и frontend
	$(COMPOSE) run --rm --no-deps server radon cc src -s -a
	$(COMPOSE) run --rm --no-deps app npm run -s complexity:report

hooks: ## Подключить git-хуки из .githooks (проверка качества кода перед коммитом)
	git config core.hooksPath .githooks

app-add: ## Добавить npm-зависимость: make app-add PKG=имя [DEV=1]
	@test -n "$(PKG)" || (echo "Укажите PKG=имя_пакета" && exit 1)
	$(COMPOSE) run --rm --no-deps app npm install --package-lock-only --no-audit --no-fund $(if $(DEV),-D) $(PKG)
	$(COMPOSE) build app
