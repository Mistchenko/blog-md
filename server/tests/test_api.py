from pathlib import Path

from fastapi.testclient import TestClient

from .conftest import write


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_tree(client: TestClient, data_dir: Path) -> None:
    write(data_dir, "about.md", "# Обо мне")
    write(data_dir, "AI/LLM.md", "# Языковые модели")

    response = client.get("/api/tree")

    assert response.status_code == 200
    tree = response.json()
    assert tree["type"] == "dir"
    assert tree["path"] == ""
    ai, about = tree["children"]
    assert ai == {
        "type": "dir",
        "name": "AI",
        "path": "AI",
        "children": [
            {
                "type": "article",
                "name": "LLM.md",
                "path": "AI/LLM.md",
                "title": "Языковые модели",
                "updated_at": ai["children"][0]["updated_at"],
            }
        ],
    }
    assert about["path"] == "about.md"
    assert about["title"] == "Обо мне"


def test_tree_sees_new_file_without_restart(client: TestClient, data_dir: Path) -> None:
    assert client.get("/api/tree").json()["children"] == []
    write(data_dir, "new.md", "# Новая")
    assert [c["title"] for c in client.get("/api/tree").json()["children"]] == ["Новая"]


def test_article(client: TestClient, data_dir: Path) -> None:
    write(data_dir, "Python/async.md", "# Async\n\nТекст")

    response = client.get("/api/articles/Python/async.md")

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "Python/async.md"
    assert body["title"] == "Async"
    assert body["content"] == "# Async\n\nТекст"
    assert "updated_at" in body


def test_article_not_found(client: TestClient) -> None:
    response = client.get("/api/articles/missing.md")
    assert response.status_code == 404
    assert response.json() == {"detail": "Статья не найдена"}


def test_article_invalid_path(client: TestClient, data_dir: Path) -> None:
    write(data_dir, "notes.txt", "x")
    for url in [
        "/api/articles/notes.txt",
        "/api/articles/%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82.md",  # Привет.md
        "/api/articles/..%2F..%2Fetc%2Fpasswd.md",
        "/api/articles/a%20b.md",
    ]:
        response = client.get(url)
        assert response.status_code == 400, url
        assert response.json() == {"detail": "Недопустимый путь к статье"}
