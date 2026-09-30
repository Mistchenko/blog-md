import logging
from pathlib import Path
from typing import Any

import pytest

from blog.content import (
    ArticleNotFoundError,
    InvalidPathError,
    build_tree,
    is_article_name,
    is_valid_name,
    read_article,
    title_from_first_line,
)
from blog.schemas import ArticleNode, DirNode

from .conftest import write

type Shape = str | dict[str, list[Shape]]


def skipped_paths(caplog: pytest.LogCaptureFixture) -> list[str]:
    """Пути из предупреждений content «skipped <путь>: <причина>»."""
    return [str(r.args[0]) for r in caplog.records if isinstance(r.args, tuple)]


def shape(node: DirNode | ArticleNode) -> Shape:
    """Дерево в компактном виде для сравнения в тестах."""
    if node.type == "article":
        return node.path
    return {node.path: [shape(child) for child in node.children]}


@pytest.mark.parametrize(
    "name",
    ["a.md", "LLM.md", "v1.2-notes_final.md", "2026-09-30.md", "Python", "a_b-c.d"],
)
def test_valid_names(name: str) -> None:
    assert is_valid_name(name)


@pytest.mark.parametrize(
    "name",
    [
        "",
        ".",
        "..",
        ".hidden.md",
        ".md",
        "Привет.md",
        "my post.md",
        "a/b.md",
        "a\\b.md",
        "ё",
        "a+b.md",
    ],
)
def test_invalid_names(name: str) -> None:
    assert not is_valid_name(name)


def test_article_names() -> None:
    assert is_article_name("a.md")
    assert not is_article_name("a.txt")
    assert not is_article_name("a.MD")
    assert not is_article_name(".md")


@pytest.mark.parametrize(
    ("line", "expected"),
    [
        ("# Большие языковые модели\n", "Большие языковые модели"),
        ("## Подзаголовок", "Подзаголовок"),
        ("#Без пробела", "Без пробела"),
        ("Просто строка\r\n", "Просто строка"),
        ("\ufeff# С BOM", "С BOM"),
        ("   #   ", "fallback"),
        ("#", "fallback"),
        ("", "fallback"),
        ("\n", "fallback"),
    ],
)
def test_title_from_first_line(line: str, expected: str) -> None:
    assert title_from_first_line(line, "fallback") == expected


def test_tree_structure_and_sorting(data_dir: Path) -> None:
    write(data_dir, "about.md", "# Обо мне")
    write(data_dir, "AI/LLM.md", "# Языковые модели")
    write(data_dir, "AI/Diffusion.md", "# Диффузия")
    write(data_dir, "ai-deep/x/y/deep.md", "# Deep")
    write(data_dir, "Python/async.md", "# Async")
    write(data_dir, "zeta.md", "# Альфа")

    tree = build_tree(data_dir)

    assert tree.type == "dir"
    assert tree.name == ""
    assert tree.path == ""
    assert shape(tree) == {
        "": [
            # папки первыми, по имени без учёта регистра
            {"AI": ["AI/Diffusion.md", "AI/LLM.md"]},
            {"ai-deep": [{"ai-deep/x": [{"ai-deep/x/y": ["ai-deep/x/y/deep.md"]}]}]},
            {"Python": ["Python/async.md"]},
            # статьи по заголовку: «Альфа» < «Обо мне»
            "zeta.md",
            "about.md",
        ]
    }


def test_tree_article_fields(data_dir: Path) -> None:
    write(data_dir, "AI/LLM.md", "# Языковые модели\n\nТекст")
    write(data_dir, "AI/untitled.md", "\nТекст без заголовка")

    ai = build_tree(data_dir).children[0]

    assert isinstance(ai, DirNode)
    assert ai.name == "AI"
    by_name = {a.name: a for a in ai.children if isinstance(a, ArticleNode)}
    assert by_name.keys() == {"LLM.md", "untitled.md"}
    assert by_name["LLM.md"].title == "Языковые модели"
    assert by_name["LLM.md"].path == "AI/LLM.md"
    assert by_name["LLM.md"].updated_at.tzinfo is not None
    assert by_name["untitled.md"].title == "untitled"


def test_tree_skips_non_articles_and_empty_dirs(data_dir: Path) -> None:
    write(data_dir, "ok.md", "# Ok")
    write(data_dir, "notes.txt", "text")
    write(data_dir, "about.py", "# markdown в .py")
    write(data_dir, "images/logo.png", "png")
    (data_dir / "empty").mkdir()
    write(data_dir, ".hidden.md", "# Hidden")
    write(data_dir, ".git/HEAD.md", "# git")

    assert shape(build_tree(data_dir)) == {"": ["ok.md"]}


def test_tree_skips_invalid_names_with_single_warning(
    data_dir: Path, caplog: pytest.LogCaptureFixture
) -> None:
    write(data_dir, "ok.md", "# Ok")
    write(data_dir, "Привет.md", "# Привет")
    write(data_dir, "my post.md", "# Post")
    write(data_dir, "Статьи/inner.md", "# Inner")
    write(data_dir, ".DS_Store", "")

    with caplog.at_level(logging.WARNING, logger="blog.content"):
        assert shape(build_tree(data_dir)) == {"": ["ok.md"]}
        build_tree(data_dir)

    skipped = sorted(skipped_paths(caplog))
    assert skipped == ["my post.md", "Привет.md", "Статьи"]


def test_tree_skips_symlinks(data_dir: Path, tmp_path: Path) -> None:
    outside = write(tmp_path, "outside/secret.md", "# Secret")
    write(data_dir, "ok.md", "# Ok")
    (data_dir / "link.md").symlink_to(outside)
    (data_dir / "linkdir").symlink_to(outside.parent)

    assert shape(build_tree(data_dir)) == {"": ["ok.md"]}


def test_tree_empty_storage(data_dir: Path) -> None:
    tree = build_tree(data_dir)
    assert tree.children == []


def test_read_article(data_dir: Path) -> None:
    write(data_dir, "AI/LLM.md", "\ufeff# Языковые модели\n\nТекст")

    article = read_article(data_dir, "AI/LLM.md")

    assert article.path == "AI/LLM.md"
    assert article.title == "Языковые модели"
    assert article.content == "# Языковые модели\n\nТекст"


def test_read_article_is_case_sensitive_as_is(data_dir: Path) -> None:
    write(data_dir, "AI/LLM.md", "# x")
    assert read_article(data_dir, "AI/LLM.md").path == "AI/LLM.md"


@pytest.mark.parametrize(
    "rel",
    [
        "",
        "/etc/passwd.md",
        "../secret.md",
        "AI/../../secret.md",
        "./about.md",
        "AI//LLM.md",
        "AI/",
        "AI/notes.txt",
        "AI/Привет.md",
        "AI/.hidden.md",
        "AI\\LLM.md",
    ],
)
def test_read_article_invalid_path(data_dir: Path, rel: str) -> None:
    with pytest.raises(InvalidPathError):
        read_article(data_dir, rel)


def test_read_article_not_found(data_dir: Path) -> None:
    write(data_dir, "dir.md/inner.md", "# x")
    with pytest.raises(ArticleNotFoundError):
        read_article(data_dir, "missing.md")
    with pytest.raises(ArticleNotFoundError):
        read_article(data_dir, "dir.md")


def test_read_article_rejects_symlinks(data_dir: Path, tmp_path: Path) -> None:
    outside = write(tmp_path, "outside/secret.md", "# Secret")
    (data_dir / "link.md").symlink_to(outside)
    (data_dir / "linkdir").symlink_to(outside.parent)
    write(data_dir, "real.md", "# Real")
    (data_dir / "alias.md").symlink_to(data_dir / "real.md")

    for rel in ["link.md", "linkdir/secret.md", "alias.md"]:
        with pytest.raises(ArticleNotFoundError):
            read_article(data_dir, rel)


def fail_for(monkeypatch: pytest.MonkeyPatch, method: str, name: str) -> None:
    """Path.<method> бросает PermissionError для файла или папки с именем name.

    Тесты в контейнере идут от root, для которого chmod ничего не запрещает,
    поэтому ошибки файловой системы имитируются.
    """
    original = getattr(Path, method)

    def patched(self: Path, *args: Any, **kwargs: Any) -> Any:
        if self.name == name:
            raise PermissionError(f"denied: {self.name}")
        return original(self, *args, **kwargs)

    monkeypatch.setattr(Path, method, patched)


def test_tree_skips_unreadable_dir(
    data_dir: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    write(data_dir, "ok.md", "# Ok")
    write(data_dir, "locked/inner.md", "# Inner")
    fail_for(monkeypatch, "iterdir", "locked")

    with caplog.at_level(logging.WARNING, logger="blog.content"):
        assert shape(build_tree(data_dir)) == {"": ["ok.md"]}

    assert skipped_paths(caplog) == ["locked"]


def test_tree_unreadable_root_is_empty(data_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    write(data_dir, "ok.md", "# Ok")
    fail_for(monkeypatch, "iterdir", data_dir.name)

    assert build_tree(data_dir).children == []


def test_tree_skips_unreadable_file(
    data_dir: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    write(data_dir, "ok.md", "# Ok")
    write(data_dir, "broken.md", "# Broken")
    fail_for(monkeypatch, "open", "broken.md")

    with caplog.at_level(logging.WARNING, logger="blog.content"):
        assert shape(build_tree(data_dir)) == {"": ["ok.md"]}

    assert skipped_paths(caplog) == ["broken.md"]


def test_read_article_unreadable_file(data_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    write(data_dir, "broken.md", "# Broken")
    fail_for(monkeypatch, "read_text", "broken.md")

    with pytest.raises(ArticleNotFoundError):
        read_article(data_dir, "broken.md")
