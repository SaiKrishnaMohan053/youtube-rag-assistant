import importlib.util
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient


def load_app_with_test_embeddings():
    os.environ["EMBEDDING_TEST_MODE"] = "true"

    module_name = "embedding_app"
    if module_name in sys.modules:
        del sys.modules[module_name]

    app_path = Path(__file__).resolve().parents[1] / "app.py"
    spec = importlib.util.spec_from_file_location(module_name, app_path)
    module = importlib.util.module_from_spec(spec)

    assert spec.loader is not None

    spec.loader.exec_module(module)
    return module


def load_app_without_test_embeddings():
    os.environ.pop("EMBEDDING_TEST_MODE", None)

    module_name = "embedding_app"
    if module_name in sys.modules:
        del sys.modules[module_name]

    app_path = Path(__file__).resolve().parents[1] / "app.py"
    spec = importlib.util.spec_from_file_location(module_name, app_path)
    module = importlib.util.module_from_spec(spec)

    assert spec.loader is not None

    spec.loader.exec_module(module)
    return module


def test_health_endpoint_requires_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    app_module = load_app_without_test_embeddings()
    client = TestClient(app_module.app)

    res = client.get("/health")

    assert res.status_code == 500
    assert "OPENAI_API_KEY" in res.json()["detail"]


def test_health_endpoint_success_with_openai_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    app_module = load_app_without_test_embeddings()
    client = TestClient(app_module.app)

    res = client.get("/health")

    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_embed_validation():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    res = client.post("/embed", json={"texts": ["   "]})

    assert res.status_code == 400


def test_embed_success():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    res = client.post("/embed", json={"texts": ["hello", "world"]})

    assert res.status_code == 200

    data = res.json()

    assert data["count"] == 2
    assert len(data["embeddings"]) == 2
    assert len(data["embeddings"][0]) == 4


def test_index_video_success():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    payload = {
        "videoId": "video123",
        "chunks": [
            {"chunkId": "c1", "text": "first chunk", "chunkIndex": 0},
            {"chunkId": "c2", "text": "second chunk", "chunkIndex": 1},
        ],
    }

    res = client.post("/index-video", json=payload)

    assert res.status_code == 200

    data = res.json()

    assert data["videoId"] == "video123"
    assert data["indexed"] == 2


def test_index_video_empty_chunks():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    payload = {
        "videoId": "video123",
        "chunks": [
            {"chunkId": "c1", "text": "   ", "chunkIndex": 0},
        ],
    }

    res = client.post("/index-video", json=payload)

    assert res.status_code == 400


def test_search_missing_index():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    res = client.post(
        "/search",
        json={"videoId": "missing_video", "query": "test", "topK": 2},
    )

    assert res.status_code == 404


def test_search_blank_query():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    res = client.post(
        "/search",
        json={"videoId": "video123", "query": "   ", "topK": 2},
    )

    assert res.status_code == 400


def test_search_success():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    client.post(
        "/index-video",
        json={
            "videoId": "video123",
            "chunks": [
                {"chunkId": "c1", "text": "hello world", "chunkIndex": 0},
                {"chunkId": "c2", "text": "machine learning", "chunkIndex": 1},
            ],
        },
    )

    res = client.post(
        "/search",
        json={"videoId": "video123", "query": "hello", "topK": 2},
    )

    assert res.status_code == 200

    data = res.json()

    assert data["videoId"] == "video123"
    assert data["query"] == "hello"
    assert len(data["matches"]) > 0
    assert data["matches"][0]["chunkId"] is not None
    assert data["matches"][0]["text"] is not None


def test_search_topk_limit():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    client.post(
        "/index-video",
        json={
            "videoId": "video_topk",
            "chunks": [
                {"chunkId": f"c{i}", "text": f"text {i}", "chunkIndex": i} for i in range(5)
            ],
        },
    )

    res = client.post(
        "/search",
        json={"videoId": "video_topk", "query": "text", "topK": 2},
    )

    assert res.status_code == 200
    assert len(res.json()["matches"]) == 2


def test_delete_video_index_success():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    video_id = "delete_video123"

    client.post(
        "/index-video",
        json={
            "videoId": video_id,
            "chunks": [
                {"chunkId": "c1", "text": "hello world", "chunkIndex": 0},
                {"chunkId": "c2", "text": "machine learning", "chunkIndex": 1},
            ],
        },
    )

    index_path, metadata_path, _ = app_module._video_paths(video_id)

    assert index_path.exists()
    assert metadata_path.exists()

    res = client.delete(f"/videos/{video_id}/index")

    assert res.status_code == 200
    assert res.json()["videoId"] == video_id
    assert res.json()["deleted"] is True
    assert not index_path.exists()
    assert not metadata_path.exists()


def test_delete_video_index_missing_returns_404():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    res = client.delete("/videos/missing_video/index")

    assert res.status_code == 404


def test_delete_video_index_invalid_video_id():
    app_module = load_app_with_test_embeddings()
    client = TestClient(app_module.app)

    res = client.delete("/videos/invalid video id/index")

    assert res.status_code == 400
