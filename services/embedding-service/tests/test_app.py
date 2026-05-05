import importlib.util
import sys
import types
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient


def load_app_with_mock_model():
    fake_module = types.ModuleType("sentence_transformers")

    class DummyModel:
        def encode(self, texts, convert_to_numpy=True):
            return np.ones((len(texts), 4), dtype=np.float32)

    class FakeSentenceTransformer:
        def __new__(cls, _name):
            return DummyModel()

    fake_module.SentenceTransformer = FakeSentenceTransformer
    sys.modules["sentence_transformers"] = fake_module

    app_path = Path(__file__).resolve().parents[1] / "app.py"
    spec = importlib.util.spec_from_file_location("embedding_app", app_path)
    module = importlib.util.module_from_spec(spec)

    assert spec.loader is not None

    spec.loader.exec_module(module)
    return module


def test_health_endpoint():
    app_module = load_app_with_mock_model()
    client = TestClient(app_module.app)

    res = client.get("/health")

    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_embed_validation():
    app_module = load_app_with_mock_model()
    client = TestClient(app_module.app)

    res = client.post("/embed", json={"texts": ["   "]})

    assert res.status_code == 400


def test_embed_success():
    app_module = load_app_with_mock_model()
    client = TestClient(app_module.app)

    res = client.post("/embed", json={"texts": ["hello", "world"]})

    assert res.status_code == 200
    data = res.json()

    assert data["count"] == 2
    assert len(data["embeddings"]) == 2
    assert len(data["embeddings"][0]) == 4


def test_index_video_success():
    app_module = load_app_with_mock_model()
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
    app_module = load_app_with_mock_model()
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
    app_module = load_app_with_mock_model()
    client = TestClient(app_module.app)

    res = client.post(
        "/search",
        json={"videoId": "missing_video", "query": "test", "topK": 2},
    )

    assert res.status_code == 404


def test_search_blank_query():
    app_module = load_app_with_mock_model()
    client = TestClient(app_module.app)

    res = client.post(
        "/search",
        json={"videoId": "video123", "query": "   ", "topK": 2},
    )

    assert res.status_code == 400


def test_search_success():
    app_module = load_app_with_mock_model()
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
    app_module = load_app_with_mock_model()
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
