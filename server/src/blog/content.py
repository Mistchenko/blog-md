"""Чтение хранилища статей: правило имён, дерево, заголовки, защита путей."""

import logging
import re
from datetime import UTC, datetime
from pathlib import Path

from .schemas import Article, ArticleNode, DirNode

logger = logging.getLogger(__name__)

NAME_RE = re.compile(r"[A-Za-z0-9._-]+")
ARTICLE_SUFFIX = ".md"

# Пути, о которых уже предупредили: чтобы не засорять лог на каждый запрос дерева
_warned: set[str] = set()


class InvalidPathError(ValueError):
    pass


class ArticleNotFoundError(LookupError):
    pass


def is_valid_name(name: str) -> bool:
    """Сегмент пути: латиница, цифры, `-`, `_`, `.`; не начинается с точки."""
    return NAME_RE.fullmatch(name) is not None and not name.startswith(".")


def is_article_name(name: str) -> bool:
    return is_valid_name(name) and name.endswith(ARTICLE_SUFFIX)


def title_from_first_line(line: str, fallback: str) -> str:
    """Заголовок — первая строка без `#`; пустой результат заменяется на fallback."""
    title = line.removeprefix("\ufeff").strip().lstrip("#").strip()
    return title or fallback


def _stem(name: str) -> str:
    return name.removesuffix(ARTICLE_SUFFIX)


def _mtime(path: Path) -> datetime:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)


def _warn_once(rel_path: str, reason: str) -> None:
    if rel_path not in _warned:
        _warned.add(rel_path)
        logger.warning("skipped %r: %s", rel_path, reason)


def build_tree(root: Path) -> DirNode:
    return _scan_dir(root, root) or DirNode(name="", path="")


def _rel(path: Path, root: Path) -> str:
    return "" if path == root else path.relative_to(root).as_posix()


def _scan_dir(directory: Path, root: Path) -> DirNode | None:
    """Папка со статьями на любой глубине; None, если статей в ней нет."""
    try:
        entries = list(directory.iterdir())
    except OSError as exc:
        _warn_once(_rel(directory, root), f"cannot list: {exc}")
        return None

    dirs: list[DirNode] = []
    articles: list[ArticleNode] = []
    for entry in entries:
        node = _scan_entry(entry, root)
        if isinstance(node, DirNode):
            dirs.append(node)
        elif isinstance(node, ArticleNode):
            articles.append(node)

    is_root = directory == root
    if not is_root and not dirs and not articles:
        return None

    dirs.sort(key=lambda d: d.name.casefold())
    articles.sort(key=lambda a: (a.title.casefold(), a.name))
    return DirNode(
        name="" if is_root else directory.name,
        path=_rel(directory, root),
        children=[*dirs, *articles],
    )


def _scan_entry(entry: Path, root: Path) -> DirNode | ArticleNode | None:
    """Узел дерева для элемента папки; None, если элемент в дерево не попадает."""
    name = entry.name
    rel = _rel(entry, root)
    if name.startswith(".") or entry.is_symlink():
        return None
    if not is_valid_name(name):
        _warn_once(rel, "invalid name, allowed: A-Z a-z 0-9 . _ -")
        return None
    if entry.is_dir():
        return _scan_dir(entry, root)
    if not (entry.is_file() and is_article_name(name)):
        return None
    try:
        return _article_node(entry, rel)
    except OSError as exc:
        _warn_once(rel, f"cannot read: {exc}")
        return None


def _article_node(path: Path, rel: str) -> ArticleNode:
    with path.open(encoding="utf-8", errors="replace") as f:
        first_line = f.readline()
    return ArticleNode(
        name=path.name,
        path=rel,
        title=title_from_first_line(first_line, _stem(path.name)),
        updated_at=_mtime(path),
    )


def resolve_article_path(root: Path, rel_path: str) -> Path:
    """Проверяет путь из запроса и возвращает файл статьи внутри root."""
    parts = rel_path.split("/")
    if not all(is_valid_name(p) for p in parts) or not is_article_name(parts[-1]):
        raise InvalidPathError(rel_path)

    candidate = root.joinpath(*parts)
    try:
        resolved = candidate.resolve(strict=True)
    except OSError:
        raise ArticleNotFoundError(rel_path) from None

    # Несовпадение с исходным путём означает симлинк где-то по дороге
    if resolved != candidate or not resolved.is_relative_to(root) or not resolved.is_file():
        raise ArticleNotFoundError(rel_path)
    return resolved


def read_article(root: Path, rel_path: str) -> Article:
    path = resolve_article_path(root, rel_path)
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        updated_at = _mtime(path)
    except OSError:
        raise ArticleNotFoundError(rel_path) from None

    first_line = content.split("\n", 1)[0]
    return Article(
        path=rel_path,
        title=title_from_first_line(first_line, _stem(path.name)),
        content=content.removeprefix("\ufeff"),
        updated_at=updated_at,
    )
