# YouTube RAG Assistant

> Full-stack Retrieval-Augmented Generation assistant for YouTube videos.  
> Process transcripts, generate embeddings, run semantic search, and ask grounded AI questions with persistent chat history.

---

## Overview

**YouTube RAG Assistant** is a multi-service application that turns YouTube transcripts into a searchable knowledge base for each user.

The system lets users:

- register and authenticate with JWT or Google OAuth
- submit YouTube video URLs for transcript processing
- chunk transcripts with timestamps and overlap support
- generate embeddings through a Python FastAPI service
- store per-video FAISS indexes for semantic retrieval
- ask grounded questions using OpenAI or Ollama
- persist chat history and processed video metadata in MongoDB

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | React 18, Vite, Material UI, React Router, Axios |
| **Backend API** | Node.js, Express.js, Mongoose, JWT, bcryptjs |
| **Database** | MongoDB |
| **Embedding Service** | Python, FastAPI, Uvicorn, NumPy |
| **Vector Search** | FAISS CPU |
| **AI Providers** | OpenAI Embeddings, OpenAI Chat, Ollama |
| **Auth & Email** | Google OAuth, Nodemailer |
| **Testing & Quality** | Jest, Supertest, Pytest, Prettier, Black |

---

## Architecture Flow

```text
YouTube Video URL
  ->
Video ID Extraction
  ->
Transcript Fetch (Supadata)
  ->
MongoDB Storage
  ->
Transcript Chunking
  ->
Embedding Service (FastAPI)
  ->
OpenAI Embeddings
  ->
FAISS Per-Video Index
  ->
Semantic Retrieval
  ->
OpenAI / Ollama Answer Generation
  ->
Persistent Chat History
```

---

## Folder Structure

```text
youtube-rag-assistant/
|
|-- client/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- routes/
|   |   `-- App.jsx
|   `-- package.json
|
|-- services/
|   `-- embedding-service/
|       |-- app.py
|       |-- requirements.txt
|       |-- tests/
|       `-- vector_store/
|
|-- src/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- utils/
|   |-- app.js
|   `-- server.js
|
|-- scripts/
|-- tests/
|-- .github/workflows/
|-- .env.example
|-- package.json
`-- README.md
```

---

## Core Modules

| File / Module | Purpose |
|---------------|---------|
| `src/services/transcript.service.js` | Fetches transcript data from Supadata. |
| `src/services/chunk.service.js` | Splits transcripts into timestamp-aware chunks. |
| `src/services/embeddingClient.service.js` | Sends chunk data to the embedding service. |
| `src/services/llm.service.js` | Routes answer generation to OpenAI or Ollama. |
| `src/controllers/video.controller.js` | Handles video processing, listing, retrieval, and deletion. |
| `src/controllers/qa.controller.js` | Runs RAG Q&A and returns chat responses. |
| `services/embedding-service/app.py` | Generates embeddings, builds FAISS indexes, and performs vector search. |

---

## Environment Variables

Create a root `.env` file before running the project.

```bash
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://127.0.0.1:27017/youtube_rag_assistant

JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d

EMBEDDING_SERVICE_URL=http://localhost:8001

LLM_PROVIDER=openai

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_MS=120000

SUPADATA_API_KEY=your_supadata_key

CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=YouTube RAG Assistant <no-reply@example.com>
```

Notes:

- `PORT`, `MONGODB_URI`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `EMBEDDING_SERVICE_URL` are required.
- If `LLM_PROVIDER=openai`, `OPENAI_API_KEY` is required.
- If `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL` is required.
- `GOOGLE_CLIENT_ID` and SMTP settings are optional, but needed for Google OAuth and email verification flows.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/SaiKrishnaMohan053/youtube-rag-assistant.git
cd youtube-rag-assistant
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

### 4. Create the Environment File

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

### 5. Set Up the Python Embedding Service

```bash
cd services/embedding-service
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\activate
pip install -r requirements.txt
```

macOS / Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Return to the repository root after setup.

---

## Running the Project

Make sure these dependencies are available first:

- MongoDB
- Python virtual environment inside `services/embedding-service/.venv`
- OpenAI API key or Ollama runtime
- Supadata API key

### Start MongoDB

```bash
mongod
```

Or use MongoDB Atlas.

### Start Backend API + Embedding Service

From the root folder:

```bash
npm run dev
```

This starts:

- Backend API at `http://localhost:5000`
- Embedding service at `http://localhost:8001`

Note:

- `npm run dev:embedding` uses `services/embedding-service/.venv/Scripts/python.exe`, so the current script is Windows-oriented.

### Start the Frontend

In a separate terminal:

```bash
cd client
npm run dev
```

Frontend URL:

`http://localhost:5173`

---

## REST API Endpoints

Base API URL:

`http://localhost:5000/api`

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Backend API health check. |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user. |
| `GET` | `/auth/verify-email` | Verify email with token. |
| `POST` | `/auth/login` | Login with email and password. |
| `POST` | `/auth/google` | Login with Google OAuth credential. |
| `GET` | `/auth/me` | Get logged-in user profile. |

### Videos, Chunks, Search, and Q&A

All routes below require JWT authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/videos/process` | Process a YouTube URL and create the video record. |
| `GET` | `/videos` | Get all videos for the logged-in user. |
| `GET` | `/videos/:id` | Get one processed video. |
| `DELETE` | `/videos/:id` | Delete video, chunks, chats, and FAISS index. |
| `POST` | `/videos/:id/chunks` | Create transcript chunks for a video. |
| `GET` | `/videos/:id/chunks` | Get transcript chunks. |
| `GET` | `/videos/embedding-health` | Check embedding service health through backend. |
| `POST` | `/videos/:id/index` | Generate embeddings and build the FAISS index. |
| `POST` | `/videos/:id/search` | Run semantic search on the indexed transcript. |
| `POST` | `/videos/:id/ask` | Ask a grounded question about the video. |
| `GET` | `/videos/:id/chats` | Fetch persistent chat history for a video. |

### Embedding Service

Base URL:

`http://localhost:8001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Embedding service health check. |
| `POST` | `/embed` | Generate embeddings for raw text. |
| `POST` | `/index-video` | Build a FAISS index for a video. |
| `POST` | `/search` | Search a video index by semantic similarity. |
| `DELETE` | `/videos/:video_id/index` | Delete a stored FAISS index. |

---

## Example Workflow

```text
1. Register or log in
2. Submit a YouTube URL
3. Create transcript chunks
4. Index embeddings
5. Open the video chat page
6. Ask questions or request a summary
7. Review grounded answers with retrieved transcript support
```

---

## Available Scripts

### Root Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend API and embedding service together. |
| `npm run dev:api` | Start backend API only. |
| `npm run dev:embedding` | Start embedding service only. |
| `npm start` | Start backend in production mode. |
| `npm test` | Run backend Jest tests. |
| `npm run test:watch` | Run Jest in watch mode. |
| `npm run format` | Format JS, JSON, YAML, and Markdown files. |
| `npm run format:check` | Check formatting with Prettier. |
| `npm run format:python` | Format Python files with Black. |
| `npm run format:python:check` | Check Python formatting with Black. |
| `npm run audit` | Run `npm audit` with high severity threshold. |
| `npm run check` | Run project JS checks from `scripts/check-js.js`. |

### Frontend Scripts

Run these inside `client/`.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server. |
| `npm run build` | Build the frontend for production. |
| `npm run preview` | Preview the production build locally. |

---

## Testing

### Backend

```bash
npm test
```

### Python Embedding Service

```bash
pytest services/embedding-service/tests
```

### Formatting Checks

```bash
npm run format:check
black --check services/embedding-service
```

---

## RAG Behavior

### Standard Q&A Mode

- retrieves the most relevant transcript chunks
- builds a grounded prompt from transcript context
- generates concise answers from the selected LLM provider
- returns supporting transcript chunks with the answer

Fallback behavior:

`I don't have enough transcript context to answer that.`

### Summary Mode

Summary mode is triggered for prompts such as:

- summarize
- overview
- key points
- what is this video about

In summary mode, the application samples transcript sections, removes low-signal content, and returns a more structured summary response.

---

## Operational Notes

- MongoDB stores users, videos, transcript chunks, and chat history.
- FAISS indexes are stored locally under the embedding service.
- Some YouTube videos may not expose transcripts.
- For question answering, use this order: process video -> create chunks -> index embeddings -> ask question.

---

## Production Recommendations

- move MongoDB to Atlas or another managed deployment
- use persistent storage for FAISS indexes
- configure HTTPS and strict secret management
- add rate limiting and better request validation
- introduce background jobs for indexing
- add monitoring, retries, and caching

---

## Roadmap

- streaming AI responses
- background processing queues
- Redis caching
- multi-video search
- citation highlighting
- real-time indexing progress
- vector database migration

---

## License

ISC License

---

## Author

**Sai Krishna Mohan**  
GitHub: [SaiKrishnaMohan053](https://github.com/SaiKrishnaMohan053)