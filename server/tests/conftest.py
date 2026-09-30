from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from blog import content
from blog.main import create_app


def write(root: Path, rel: str, text: str = "") -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


@pytest.fixture(autouse=True)
def _reset_warnings() -> None:
    content._warned.clear()


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    root = tmp_path / "data"
    root.mkdir()
    return root


@pytest.fixture
def client(data_dir: Path) -> TestClient:
    return TestClient(create_app(data_dir))
