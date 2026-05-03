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


def test_search_missing_index():
    app_module = load_app_with_mock_model()
    client = TestClient(app_module.app)
    res = client.post("/search", json={"videoId": "missing_video", "query": "test", "topK": 2})
    assert res.status_code == 404
