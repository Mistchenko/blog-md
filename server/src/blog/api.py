from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from . import content
from .schemas import Article, DirNode

router = APIRouter(prefix="/api")


def _data_dir(request: Request) -> Path:
    # app.state в Starlette не типизирован; тип задаёт create_app
    data_dir: Path = request.app.state.data_dir
    return data_dir


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/tree")
def get_tree(request: Request) -> DirNode:
    return content.build_tree(_data_dir(request))


@router.get("/articles/{path:path}")
def get_article(path: str, request: Request) -> Article:
    try:
        return content.read_article(_data_dir(request), path)
    except content.InvalidPathError:
        raise HTTPException(status_code=400, detail="Недопустимый путь к статье") from None
    except content.ArticleNotFoundError:
        raise HTTPException(status_code=404, detail="Статья не найдена") from None
