import logging
from pathlib import Path

import pytest

from blog.main import create_app


def test_create_app_resolves_data_dir(data_dir: Path) -> None:
    app = create_app(data_dir / "sub" / "..")
    assert app.state.data_dir == data_dir.resolve()


def test_create_app_warns_on_missing_data_dir(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING, logger="blog.main"):
        create_app(tmp_path / "missing")

    assert "does not exist" in caplog.text
