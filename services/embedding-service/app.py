from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import faiss
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BASE_DIR = Path(__file__).resolve().parent
VECTOR_STORE_DIR = BASE_DIR / "vector_store"
VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_ID_REGEX = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

app = FastAPI(title="Local Embedding Service", version="1.0.0")
model = SentenceTransformer(MODEL_NAME)


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1)


class ChunkPayload(BaseModel):
    chunkId: str
    text: str
    chunkIndex: int
    startTime: Optional[float] = None
    endTime: Optional[float] = None


class IndexVideoRequest(BaseModel):
    videoId: str
    chunks: List[ChunkPayload] = Field(..., min_length=1)


class SearchRequest(BaseModel):
    videoId: str
    query: str
    topK: int = Field(default=5, ge=1, le=50)


def _validate_texts(texts: List[str]) -> List[str]:
    cleaned = [text.strip() for text in texts if isinstance(text, str) and text.strip()]
    if not cleaned:
        raise HTTPException(
            status_code=400,
            detail="texts must contain at least one non-empty string",
        )
    return cleaned


def _embed_texts(texts: List[str]) -> np.ndarray:
    embeddings = model.encode(texts, convert_to_numpy=True)
    embeddings = embeddings.astype("float32")
    faiss.normalize_L2(embeddings)
    return embeddings


def _video_paths(video_id: str) -> tuple[Path, Path, Path]:
    safe_video_id = video_id.strip()

    if not safe_video_id:
        raise HTTPException(status_code=400, detail="videoId is required")

    if not VIDEO_ID_REGEX.fullmatch(safe_video_id):
        raise HTTPException(
            status_code=400,
            detail="videoId must be 1-64 chars: letters, numbers, underscore, hyphen",
        )

    index_path = VECTOR_STORE_DIR / f"{safe_video_id}.index"
    metadata_path = VECTOR_STORE_DIR / f"{safe_video_id}.metadata.json"
    temp_index_path = VECTOR_STORE_DIR / f"{safe_video_id}.index.tmp"

    return index_path, metadata_path, temp_index_path


def _atomic_write_json(path: Path, payload: Dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def _save_video_index(
    video_id: str,
    chunks: List[ChunkPayload],
    embeddings: np.ndarray,
) -> None:
    index_path, metadata_path, temp_index_path = _video_paths(video_id)

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)

    faiss.write_index(index, str(temp_index_path))
    temp_index_path.replace(index_path)

    metadata = {
        "videoId": video_id,
        "model": MODEL_NAME,
        "dimension": int(embeddings.shape[1]),
        "count": len(chunks),
        "chunks": [chunk.model_dump() for chunk in chunks],
    }

    _atomic_write_json(metadata_path, metadata)


def _load_video_index(video_id: str) -> tuple[faiss.Index, Dict[str, Any]]:
    index_path, metadata_path, _ = _video_paths(video_id)

    if not index_path.exists() or not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Index for videoId not found")

    try:
        index = faiss.read_index(str(index_path))
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to load index: {error}") from error

    return index, metadata


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed")
def embed(request: EmbedRequest) -> Dict[str, Any]:
    texts = _validate_texts(request.texts)
    embeddings = _embed_texts(texts)

    return {
        "count": len(texts),
        "embeddings": embeddings.tolist(),
    }


@app.post("/index-video")
def index_video(request: IndexVideoRequest) -> Dict[str, Any]:
    if not request.videoId.strip():
        raise HTTPException(status_code=400, detail="videoId is required")

    valid_chunks = [chunk for chunk in request.chunks if chunk.text and chunk.text.strip()]

    if not valid_chunks:
        raise HTTPException(
            status_code=400,
            detail="chunks must include at least one non-empty text",
        )

    texts = [chunk.text.strip() for chunk in valid_chunks]
    embeddings = _embed_texts(texts)

    try:
        _save_video_index(request.videoId, valid_chunks, embeddings)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save video index: {error}",
        ) from error

    return {
        "videoId": request.videoId,
        "indexed": len(valid_chunks),
        "model": MODEL_NAME,
    }


@app.post("/search")
def search(request: SearchRequest) -> Dict[str, Any]:
    if not request.videoId.strip():
        raise HTTPException(status_code=400, detail="videoId is required")

    if not request.query.strip():
        raise HTTPException(status_code=400, detail="query is required")

    index, metadata = _load_video_index(request.videoId)

    query_embedding = _embed_texts([request.query.strip()])
    top_k = min(request.topK, index.ntotal)

    if top_k <= 0:
        return {"videoId": request.videoId, "matches": []}

    scores, indices = index.search(query_embedding, top_k)

    chunks = metadata.get("chunks", [])
    matches: List[Dict[str, Any]] = []

    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(chunks):
            continue

        chunk_meta = chunks[idx]

        matches.append(
            {
                "score": float(score),
                "chunkId": chunk_meta.get("chunkId"),
                "chunkIndex": chunk_meta.get("chunkIndex"),
                "startTime": chunk_meta.get("startTime"),
                "endTime": chunk_meta.get("endTime"),
                "text": chunk_meta.get("text"),
            }
        )

    return {
        "videoId": request.videoId,
        "query": request.query,
        "topK": request.topK,
        "matches": matches,
    }


@app.delete("/videos/{video_id}/index")
def delete_video_index(video_id: str) -> Dict[str, Any]:
    index_path, metadata_path, temp_index_path = _video_paths(video_id)

    if not index_path.exists() and not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Index for videoId not found")

    deleted_files = []

    for path in [index_path, metadata_path, temp_index_path]:
        if path.exists():
            path.unlink()
            deleted_files.append(path.name)

    return {
        "videoId": video_id,
        "deleted": True,
        "deletedFiles": deleted_files,
    }


EmbedRequest.model_rebuild()
ChunkPayload.model_rebuild()
IndexVideoRequest.model_rebuild()
SearchRequest.model_rebuild()