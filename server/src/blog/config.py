from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Корень хранилища статей; выше него сервер ничего не читает
    data_dir: Path = Path("/data")


@lru_cache
def get_settings() -> Settings:
    return Settings()
