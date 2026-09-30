# Справочное пособие по Python Async

## 1. Введение

Асинхронное программирование в Python позволяет выполнять несколько задач одновременно без создания дополнительных потоков или процессов. Это особенно эффективно для операций ввода-вывода (I/O-bound): сетевые запросы, чтение файлов, работа с базами данных.

Ключевая библиотека — `asyncio`, входящая в стандартную библиотеку Python начиная с версии 3.4. Синтаксис `async`/`await` доступен с Python 3.5.

---

## 2. Установка и настройка

### 2.1. Проверка версии Python

Убедитесь, что установлена версия Python 3.7 или выше (рекомендуется 3.10+):

```bash
python3 --version
```

### 2.2. Установка asyncio

Начиная с Python 3.4 модуль `asyncio` входит в стандартную библиотеку, поэтому отдельная установка **не требуется**.

Для Python 3.3 (устаревшая версия) можно установить из PyPI:

```bash
pip install asyncio
```

### 2.3. Установка дополнительных библиотек

Для сетевых запросов часто используется `aiohttp`:

```bash
pip install aiohttp
```

Для ускорения DNS-разрешения:

```bash
pip install aiohttp[speedups]
```

### 2.4. Настройка политики событийного цикла

Политика событийного цикла — глобальный объект, управляющий созданием и получением событийного цикла. По умолчанию используется `DefaultEventLoopPolicy`.

```python
import asyncio

# Получить текущую политику
policy = asyncio.get_event_loop_policy()

# Установить новую политику (например, для Windows)
# asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

---

## 3. Основные концепции

| Концепция | Описание |
|-----------|----------|
| **Event Loop** | Центральный механизм, управляющий выполнением асинхронных задач. Как дирижёр оркестра: распределяет время между задачами |
| **Coroutine** | Функция, объявленная с `async def`. Может приостанавливаться на `await` |
| **Task** | Обёртка над корутиной, запланированная для выполнения в событийном цикле |
| **Future** | Объект-заполнитель для результата, который ещё не получен |
| **Awaitable** | Объект, который можно использовать с `await` (корутины, Task, Future) |

---

## 4. Основные команды и конструкции

### 4.1. `async def` — объявление корутины

```python
async def my_coroutine():
    return "Hello, async!"
```

Простой вызов `my_coroutine()` **не выполняет** код, а создаёт объект корутины.

### 4.2. `await` — приостановка выполнения

```python
async def main():
    await asyncio.sleep(1)  # Приостановка на 1 секунду
    print("Прошла 1 секунда")
```

`await` можно применять только внутри `async def` и только к awaitable-объектам.

### 4.3. `asyncio.run()` — запуск главной корутины

```python
import asyncio

async def main():
    print("Hello")
    await asyncio.sleep(1)
    print("World")

asyncio.run(main())
```

Это рекомендуемый способ запуска асинхронной программы.

### 4.4. `asyncio.sleep()` — асинхронная задержка

```python
await asyncio.sleep(2)  # Неблокирующая задержка на 2 секунды
```

В отличие от `time.sleep()`, не блокирует событийный цикл.

### 4.5. `asyncio.create_task()` — создание задачи

```python
async def main():
    task1 = asyncio.create_task(say_after(1, 'hello'))
    task2 = asyncio.create_task(say_after(2, 'world'))
    await task1
    await task2
```

Задачи выполняются **параллельно**, что может сократить общее время выполнения.

### 4.6. `asyncio.gather()` — ожидание группы задач

```python
async def main():
    results = await asyncio.gather(
        fetch_data("url1"),
        fetch_data("url2"),
        fetch_data("url3")
    )
```

Возвращает список результатов в порядке передачи аргументов.

### 4.7. `asyncio.TaskGroup` — структурированная конкурентность (Python 3.11+)

```python
async def main():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(say_after(1, 'hello'))
        task2 = tg.create_task(say_after(2, 'world'))
    # await неявный: контекстный менеджер ждёт завершения всех задач
```

Современная альтернатива `create_task()` с гарантией завершения или отмены всех задач.

### 4.8. `asyncio.wait_for()` — таймаут для корутины

```python
try:
    await asyncio.wait_for(slow_operation(), timeout=3.0)
except asyncio.TimeoutError:
    print("Операция превысила лимит времени")
```

### 4.9. `async with` — асинхронный контекстный менеджер

```python
async with aiohttp.ClientSession() as session:
    async with session.get("https://example.com") as response:
        data = await response.text()
```

Используется для ресурсов, требующих асинхронной инициализации и очистки.

### 4.10. `async for` — асинхронная итерация

```python
async for item in async_generator():
    process(item)
```

Применяется для асинхронных генераторов и потоковых данных.

### 4.11. `asyncio.Queue` — асинхронная очередь

```python
queue = asyncio.Queue()

async def producer():
    await queue.put("item")

async def consumer():
    item = await queue.get()
    queue.task_done()
```

Безопасна для использования в нескольких задачах.

### 4.12. `asyncio.Lock` и `asyncio.Event`

```python
lock = asyncio.Lock()
event = asyncio.Event()

async def worker():
    async with lock:
        # критическая секция
        pass

async def waiter():
    await event.wait()  # ждём установки события
```

---

## 5. Практический пример: параллельные HTTP-запросы

```python
import asyncio
import aiohttp

async def fetch(session, url):
    async with session.get(url) as response:
        return await response.text()

async def main():
    urls = [
        "https://example.com",
        "https://httpbin.org/get",
        "https://api.github.com"
    ]
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        for url, result in zip(urls, results):
            print(f"{url}: {len(result)} символов")

asyncio.run(main())
```

---

## 6. Типичные ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `RuntimeWarning: coroutine was never awaited` | Вызов корутины без `await` | Использовать `await` или `asyncio.create_task()` |
| `RuntimeError: asyncio.run() cannot be called from a running event loop` | Повторный вызов `asyncio.run()` внутри работающего цикла | Использовать `await` внутри существующей корутины |
| Блокировка событийного цикла | Использование `time.sleep()`, `requests.get()` внутри `async def` | Заменить на `asyncio.sleep()`, `aiohttp` |
| `TimeoutError` | Превышен таймаут `wait_for` | Обработать исключение или увеличить таймаут |

---

## 7. Когда использовать async

| Сценарий | Рекомендация |
|----------|--------------|
| Сетевые запросы, API | ✅ `asyncio` + `aiohttp` |
| Чтение/запись файлов | ✅ `asyncio` + `aiofiles` |
| Работа с БД | ✅ Асинхронные драйверы (`asyncpg`, `aiomysql`) |
| Тяжёлые вычисления (CPU-bound) | ❌ `asyncio` не подходит — используйте `multiprocessing` |
| Простые скрипты без I/O | ❌ Обычный синхронный код проще |

---

## 8. Краткая шпаргалка

```python
# Запуск
asyncio.run(main())

# Объявление
async def func(): ...

# Ожидание
await coro()
await asyncio.sleep(1)

# Задачи
task = asyncio.create_task(coro())
await task

# Группа задач
results = await asyncio.gather(coro1(), coro2())

# TaskGroup (3.11+)
async with asyncio.TaskGroup() as tg:
    tg.create_task(coro1())
    tg.create_task(coro2())

# Таймаут
await asyncio.wait_for(coro(), timeout=5.0)

# Контекстный менеджер
async with resource() as r: ...

# Итерация
async for item in agen(): ...
```

---

## 9. Полезные ссылки

- Официальная документация `asyncio`: [docs.python.org/3/library/asyncio.html](https://docs.python.org/3/library/asyncio.html)
- Руководство по корутинам и задачам: [docs.python.org/3/library/asyncio-task.html](https://docs.python.org/3/library/asyncio-task.html)
- `aiohttp` документация: [docs.aiohttp.org](https://docs.aiohttp.org)
