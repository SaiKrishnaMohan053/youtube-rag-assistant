# Local Embedding Service (FastAPI + FAISS)

This service provides local-only embedding and vector search for video transcript chunks.

## Stack

- Python
- FastAPI
- sentence-transformers (`sentence-transformers/all-MiniLM-L6-v2`)
- FAISS (`IndexFlatIP` with L2-normalized embeddings for cosine similarity behavior)
- numpy
- uvicorn

## Setup (Windows PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

## Endpoints

### `GET /health`

Returns service health and loaded model name.

### `POST /embed`

Body:

Returns service health and loaded model name.

### `POST /embed`
Body:
```json
{
  "texts": ["text one", "text two"]
}
```

### `POST /index-video`

Body:

Returns normalized embeddings as numeric arrays.

### `POST /index-video`
Body:
```json
{
  "videoId": "youtube id",
  "chunks": [
    {
      "chunkId": "mongo chunk id",
      "text": "chunk text",
      "chunkIndex": 0,
      "startTime": 12.4,
      "endTime": 30.1
    }
  ]
}
```

### `POST /search`

Body:

Creates/overwrites a FAISS index file and sidecar metadata JSON under `vector_store/` for that `videoId`.

### `POST /search`
Body:
```json
{
  "videoId": "youtube id",
  "query": "question text",
  "topK": 5
}
```

## Notes

Loads index + metadata for `videoId`, embeds query, and returns top matches with score and chunk metadata.

## Notes
- Index files are stored per-video in `vector_store/` as:
  - `<videoId>.index`
  - `<videoId>.metadata.json`
- Service is local/free only. No paid APIs or hosted vector DBs are used.
