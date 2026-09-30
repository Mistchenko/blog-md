import logging
from pathlib import Path

from fastapi import FastAPI

from .api import router
from .config import get_settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s - %(message)s")
logger = logging.getLogger(__name__)


def create_app(data_dir: Path | None = None) -> FastAPI:
    app = FastAPI(title="Blog MD")
    app.state.data_dir = (data_dir or get_settings().data_dir).resolve()
    if not app.state.data_dir.is_dir():
        logger.warning("data dir %s does not exist", app.state.data_dir)
    app.include_router(router)
    return app


app = create_app()
