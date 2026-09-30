FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Байткод и кэши не пишем: код смонтирован с хоста, рабочая директория должна оставаться чистой
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_CACHE=1

WORKDIR /srv/server

# Зависимости ставятся в системный Python образа — без venv
COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml --extra dev

EXPOSE 8000
CMD ["uvicorn", "blog.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "src"]
