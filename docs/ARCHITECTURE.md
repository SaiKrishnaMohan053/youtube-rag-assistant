> This document primarily describes the current implementation in the repository.  
> Sections explicitly labeled **Future Improvements**, **Recommendations**, or **Production Enhancements** describe proposed upgrades that are not yet implemented.

# Architecture Documentation

## YouTube RAG Assistant

YouTube RAG Assistant is a full-stack, multi-service Retrieval-Augmented Generation (RAG) platform that transforms YouTube videos into searchable, question-answerable knowledge sources.

This document explains the architecture for engineers, reviewers, founders, and technical decision-makers. It covers service responsibilities, request flows, data design, retrieval architecture, AI orchestration, observability, evaluation, security, and scaling tradeoffs.

---

## 1. Architecture Goals

The system is designed around five major goals:

### 1.1 Turn long-form video into structured knowledge

The platform converts raw YouTube content into reusable knowledge assets by:

- Extracting transcripts
- Splitting transcripts into timestamp-aware chunks
- Generating structured summaries
- Building searchable vector indexes
- Persisting video-level context for future queries

### 1.2 Provide grounded AI answers

The application does not rely on generic model knowledge alone. It retrieves transcript context before generation so answers are grounded in the actual video content.

This improves:

- Accuracy
- Traceability
- Hallucination resistance
- User trust

### 1.3 Support multiple user journeys

The system supports three user types:

| User Type | Supported Workflow |
| --- | --- |
| Guest | Temporary video summary and follow-up Q&A |
| Authenticated User | Saved videos, transcript processing, RAG Q&A, chat history |
| Admin | User inspection, video inspection, chunk inspection, metrics, health, evaluations |

### 1.4 Separate responsibilities across services

The architecture is split into clear service boundaries:

| Service | Responsibility |
| --- | --- |
| React Frontend | User experience, routing, dashboards, chat UI |
| Node.js Backend | API orchestration, business logic, RAG workflow, auth, admin, metrics |
| Python Embedding Service | Embeddings, FAISS indexing, semantic search |
| MongoDB | Application state, transcripts, chunks, chats, metrics, evaluations |

### 1.5 Make the system measurable and improvable

The platform includes monitoring and evaluation so the RAG system can be improved over time.

It tracks:

- API latency
- Retrieval quality
- LLM performance
- Background job failures
- Evaluation scores
- Hallucination risk

---

## 2. High-Level System Overview

```text
User / Guest / Admin
        |
        v
React + Vite Frontend
        |
        v
Node.js / Express Backend API
        |
        +--> Authentication & Authorization
        +--> Video Processing
        +--> Transcript Chunking
        +--> Summary Generation
        +--> RAG Orchestration
        +--> Admin APIs
        +--> Metrics / Health / Evaluation
        |
        v
MongoDB
        |
        +--> Users
        +--> Videos
        +--> Transcript Chunks
        +--> Chat Messages
        +--> Metric Logs
        +--> Eval Reports
        |
        v
Python FastAPI Embedding Service
        |
        +--> OpenAI Embeddings
        +--> FAISS Indexes
        +--> Semantic Search
        +--> Index Lifecycle Management
```

The backend is the central orchestration layer. It receives requests from the frontend, validates access, communicates with MongoDB, calls the embedding service, builds prompts, invokes the configured LLM provider, and returns grounded responses.

---

## 3. Service Responsibilities

## 3.1 Frontend Service

**Technology:** React, Vite, Material UI, React Router, Axios

The frontend provides separate interfaces for public users, authenticated users, and administrators.

### Main responsibilities

- Public landing and guest workflow
- Login, registration, and email verification
- Authenticated dashboard
- Video processing UI
- RAG chat interface
- Chat history display
- Admin dashboard
- Metrics, health, and evaluation pages
- Route protection and role-based UI access

### Main UI areas

| Area | Purpose |
| --- | --- |
| Public Interface | Guest summarization, login, registration, email verification |
| User Dashboard | Video management, processing state, saved videos |
| Video Chat Interface | RAG Q&A, content generation, supporting context |
| Admin Dashboard | Platform inspection, health, metrics, evaluations |

### Frontend architecture pattern

```text
client/
├── src/
│   ├── api/          # Axios clients and API wrappers
│   ├── components/   # Shared UI components
│   ├── context/      # Auth/session state
│   ├── hooks/        # Reusable frontend hooks
│   ├── pages/        # Route-level screens
│   ├── routes/       # Public, protected, and admin routes
│   └── theme/        # Material UI theme configuration
```

The frontend keeps API access, routing, page components, and shared UI components separated so the application is easier to maintain and test.

---

## 3.2 Backend API Service

**Technology:** Node.js, Express.js, Mongoose, JWT, OpenAI/Ollama integration

The backend acts as the control plane for the platform.

### Main responsibilities

- User registration and login
- Email verification
- Google OAuth authentication
- JWT authentication and role checks
- YouTube URL parsing
- Transcript fetching
- Transcript chunking
- Background summary and embedding jobs
- RAG intent routing
- Hybrid retrieval orchestration
- Prompt construction
- LLM response generation
- Chat history persistence
- Admin APIs
- Health endpoints
- Metrics logging
- Evaluation execution

### Backend architecture pattern

```text
src/
├── config/        # Database and environment config
├── controllers/   # HTTP request handlers
├── middleware/    # Auth, admin, errors, logging
├── models/        # Mongoose schemas
├── routes/        # Express route declarations
├── services/      # Business logic and integrations
├── evals/         # Evaluation runner and reports
└── utils/         # Shared helpers
```

The backend follows a controller-service-model structure:

```text
Route
  -> Middleware
  -> Controller
  -> Service
  -> Model / External API
  -> Response
```

This keeps HTTP concerns separate from business logic and external integrations.

---

## 3.3 Python Embedding Service

**Technology:** FastAPI, Uvicorn, OpenAI embeddings, FAISS CPU, NumPy, Pydantic

The Python service handles vector-related workloads and exposes them as a separate microservice.

### Main responsibilities

- Generate embeddings from text
- Build per-video FAISS indexes
- Store vector index files and metadata
- Search transcript chunks semantically
- Delete vector indexes when videos are deleted
- Report index status
- Provide health checks

### Vector index identity

Each processed video gets its own vector index:

```text
videoMongoId.index
videoMongoId.metadata.json
```

The system uses the MongoDB video `_id` as the FAISS index identifier. This keeps indexes aligned with internal video records and avoids confusion between YouTube IDs and database IDs.

The deeper reason for separating this service is covered in [12.5 Why Separate the Embedding Service?](#125-why-separate-the-embedding-service).

---

## 4. Main System Flows

## 4.1 Authenticated Video Processing Flow

This flow is used when a logged-in user submits a YouTube URL.

```text
Frontend
   |
   v
POST /api/videos/process
   |
   v
Backend
   |
   +--> Validate JWT and user ownership
   +--> Extract YouTube video ID
   +--> Prevent duplicate video per user
   +--> Fetch transcript from Supadata
   +--> Format transcript with timestamps
   +--> Save Video document
   |
   v
MongoDB
   |
   v
POST /api/videos/:id/chunks
   |
   +--> Create timestamp-aware chunks
   +--> Save chunks
   +--> Start summary job
   +--> Start embedding job
   |
   v
Video Ready for RAG Q&A
```

### Key design notes

- Video records are owned by users.
- Duplicate videos are prevented per user.
- Transcript chunks are stored in MongoDB for retrieval, inspection, and re-indexing.
- Summary generation and embedding indexing run after chunk creation.

---

## 4.2 Background Processing Flow

After transcript chunks are created, background jobs prepare the video for summarization and RAG.

```text
Transcript Chunks Created
        |
        +--> Summary Job
        |       +--> Filter noisy/promotional content
        |       +--> Generate section summaries
        |       +--> Generate final structured summary
        |       +--> Save summary to Video document
        |
        +--> Embedding Job
                +--> Send chunks to Python service
                +--> Generate embeddings
                +--> Build FAISS index
                +--> Save index metadata
                +--> Mark chunks as indexed
```

Background work currently runs in-process. This is simple and effective for development, demos, and early-stage usage. In production, it can be upgraded to a queue-based system such as BullMQ, RabbitMQ, SQS, or Kafka.

---

## 4.3 Authenticated RAG Question Flow

This is the main AI Q&A flow.

```text
User Question
    |
    v
Backend validates user and video ownership
    |
    v
Question Router
    |
    +--> VIDEO_OVERVIEW
    +--> ENTITY_OVERVIEW
    +--> TOPIC_OVERVIEW
    +--> TIMESTAMP_QUERY
    +--> ACTION_EXTRACTION
    +--> SPECIFIC_QA
    |
    v
Retrieval / Response Strategy
    |
    +--> Summary reuse
    +--> Vector search
    +--> Keyword search
    +--> Entity retrieval
    +--> Topic retrieval
    |
    v
Prompt Builder
    |
    v
LLM
    |
    v
Grounded Answer + Supporting Chunks
    |
    v
Chat Message Saved
```

### Key design notes

- The system does not use one retrieval strategy for every query.
- High-level questions can reuse stored summaries.
- Specific questions use hybrid retrieval.
- Timestamp questions require transcript metadata.
- Content generation uses summaries plus grounded transcript context.

---

## 4.4 Guest Flow

Guest mode allows users to test the product without creating an account.

```text
Guest submits YouTube URL
        |
        v
Backend fetches transcript
        |
        v
Temporary summary generated
        |
        v
In-memory guest session created
        |
        v
Guest asks follow-up question using sessionId
        |
        v
Answer generated from temporary transcript context
        |
        v
Session expires automatically
```

### Guest design tradeoff

Guest sessions are stored in memory instead of MongoDB.

This keeps guest usage lightweight and avoids unnecessary persistence, but guest sessions are lost when the backend restarts. For production, guest sessions could be moved to Redis.

---

## 4.5 Admin Flow

Admin users have platform-level visibility.

```text
Admin Dashboard
    |
    +--> User inspection
    +--> User video inspection
    +--> Chunk inspection
    +--> Embedding status
    +--> Summary status
    +--> Metrics summary
    +--> Health dashboard
    +--> Evaluation reports
```

The admin layer is protected by two checks:

```text
JWT authentication
    +
role === "admin"
```

---

## 5. RAG Architecture

The RAG system is the core of the application.

## 5.1 Why RAG Is Used

A plain LLM can answer questions using general knowledge, but it does not know the exact content of a specific YouTube video unless the transcript is provided.

RAG solves this by:

1. Converting transcript chunks into searchable knowledge
2. Retrieving relevant chunks for each question
3. Passing those chunks into the LLM as context
4. Generating answers grounded in the video transcript

This improves:

- Accuracy
- Traceability
- Hallucination resistance
- Timestamp usefulness
- User trust

---

## 5.2 Intent-Aware Routing

Before retrieval, the backend classifies the question.

| Intent | Strategy |
| --- | --- |
| `VIDEO_OVERVIEW` | Use saved structured summary |
| `ENTITY_OVERVIEW` | Use entity-specific summary and/or entity retrieval |
| `TOPIC_OVERVIEW` | Use topic summary and topic retrieval |
| `TIMESTAMP_QUERY` | Retrieve chunks with timestamp metadata |
| `ACTION_EXTRACTION` | Use summaries + grounded chunks for structured output |
| `SPECIFIC_QA` | Use hybrid retrieval and grounded prompt |

This avoids treating every question the same way.

Examples:

- “What is this video about?” should not require expensive vector retrieval.
- “When did they discuss pricing?” needs timestamp-focused retrieval.
- “Create a LinkedIn post from this video” needs a content-generation strategy.
- “What did the speaker say about AI regulation?” needs grounded transcript chunks.

---

## 5.3 Hybrid Retrieval

The retrieval system combines multiple methods instead of depending on vector search alone.

| Method | Purpose |
| --- | --- |
| Vector Search | Finds semantically similar transcript chunks |
| Keyword Search | Finds exact phrase matches |
| Query Expansion | Improves recall with related search terms |
| Entity Retrieval | Improves questions about people, companies, products, or organizations |
| Topic Retrieval | Improves broad topic questions |
| Auto Re-Indexing | Rebuilds missing FAISS indexes from stored chunks |

Hybrid retrieval improves both precision and recall by combining semantic understanding with exact-match evidence.

---

## 5.4 Vector Search Design

The embedding service uses OpenAI `text-embedding-3-small` to generate embeddings.

The vector search layer uses FAISS. Embeddings are normalized so inner product similarity behaves like cosine similarity.

```text
User Query
    |
    v
OpenAI Embedding
    |
    v
FAISS Search
    |
    v
Top-K Transcript Chunks
```

Each result includes:

- Chunk ID
- Chunk index
- Start time
- End time
- Text
- Similarity score

These results are returned to the backend and merged with other retrieval sources.

---

## 5.5 Summary Reuse

The system creates a structured summary after chunking.

The summary contains:

- Short overview
- Detailed summary
- Main topics
- Key takeaways
- People/entity insights
- Topic summaries

This summary is reused for:

- Video overview questions
- Topic overview questions
- Entity overview questions
- Content generation
- Query expansion hints

Saved summaries reduce repeated LLM work and speed up high-level queries.

---

## 5.6 Grounded Answer Generation

For specific Q&A, the LLM prompt is built using retrieved transcript chunks.

The prompt is designed to:

- Use only provided transcript context
- Prefer higher-ranked chunks
- Avoid outside knowledge
- Refuse unsupported answers
- Include source references when available
- Keep answers concise and relevant

If the transcript does not contain enough information, the system can return a fallback answer instead of hallucinating.

---

## 6. Data Architecture

MongoDB stores application state and long-lived data.

## 6.1 Core Collections

| Collection | Purpose |
| --- | --- |
| `Users` | Accounts, auth provider, roles, verification state |
| `Videos` | Video metadata, transcript, processing status, structured summary |
| `TranscriptChunks` | Timestamp-aware chunks used for retrieval |
| `ChatMessages` | User questions, generated answers, supporting chunks |
| `MetricLogs` | Structured operational and performance logs |
| `EvalReports` | Saved evaluation runs and benchmark reports |

---

## 6.2 Entity Relationship Overview

```text
User
 └── Videos
      ├── TranscriptChunks
      ├── ChatMessages
      ├── MetricLogs
      └── EvalReports
```

### Relationship explanation

- A user can own many videos.
- A video can have many transcript chunks.
- A video can have many chat messages.
- Chat messages store the generated answer and retrieved supporting context.
- Metrics and evaluation reports help track system quality over time.

---

## 6.3 Video Identity Strategy

The system stores two video identifiers:

| Identifier | Purpose |
| --- | --- |
| YouTube video ID | Identifies the original YouTube source |
| MongoDB video `_id` | Used internally for ownership, chunks, chats, and FAISS indexes |

The MongoDB video `_id` is used for FAISS indexing.

This avoids collisions and keeps the vector index tied to the exact database video record.

---

## 7. Backend Module Architecture

## 7.1 Controllers

Controllers handle HTTP-level concerns:

- Read request data
- Validate required parameters
- Check ownership
- Call services
- Return API responses

| Controller | Responsibility |
| --- | --- |
| `auth.controller.js` | Register, login, Google auth, email verification |
| `video.controller.js` | Process videos and manage video records |
| `chunk.controller.js` | Create and retrieve chunks |
| `qa.controller.js` | RAG Q&A orchestration |
| `guest.controller.js` | Guest summaries and guest Q&A |
| `admin.controller.js` | Admin inspection workflows |
| `metrics.controller.js` | Metrics dashboard data |
| `health.controller.js` | Health and readiness checks |
| `eval.controller.js` | Evaluation execution and reports |

---

## 7.2 Services

Services contain business logic and integrations.

| Service | Responsibility |
| --- | --- |
| `transcript.service.js` | Fetch and format YouTube transcripts |
| `chunk.service.js` | Create timestamp-aware transcript chunks |
| `summary.service.js` | Generate structured video summaries |
| `llm.service.js` | Abstract OpenAI/Ollama generation |
| `embeddingClient.service.js` | Communicate with Python embedding service |
| `ragRetrieval.service.js` | Hybrid retrieval orchestration |
| `queryExpansion.service.js` | LLM-assisted query expansion |
| `entityRetrieval.service.js` | Entity-aware retrieval |
| `topicRetrieval.service.js` | Topic-aware retrieval |
| `timestamp.service.js` | Timestamp-oriented answer support |
| `action.service.js` | Notes, posts, outlines, action items |
| `guestSession.service.js` | Temporary guest sessions |
| `videoProcessingJob.service.js` | Background post-chunk processing |

---

## 7.3 Middleware

Middleware handles cross-cutting concerns.

| Middleware | Responsibility |
| --- | --- |
| Auth middleware | Validates JWT and attaches user |
| Admin middleware | Restricts admin-only routes |
| Error middleware | Normalizes API errors |
| Not found middleware | Handles unknown routes |
| Request logger | Captures request metrics |

---

## 8. API Architecture

The backend exposes REST API groups.

| API Group | Purpose |
| --- | --- |
| `/api/auth` | Authentication and identity |
| `/api/videos` | Video processing, chunking, indexing, RAG Q&A |
| `/api/guest` | Public guest summary and temporary Q&A |
| `/api/admin` | Admin platform inspection |
| `/api/metrics` | Metrics summary and observability |
| `/api/evals` | RAG evaluation runs and reports |
| `/api/health` | Liveness, readiness, and deep service checks |

Detailed request and response examples are documented in `docs/API.md`.

---

## 9. Observability Architecture

The system includes structured monitoring for application behavior and AI quality.

## 9.1 Logging

Logs are emitted as structured JSON events.

Common log categories:

- HTTP requests
- Video processing
- Background jobs
- Embedding service calls
- Retrieval stages
- LLM generation
- Guest sessions
- Evaluations
- Errors

## 9.2 Metrics

Metrics tracked include:

- Request latency
- Route-level performance
- Video processing time
- Summary generation time
- Embedding indexing time
- Retrieval score distribution
- LLM latency
- Prompt and answer size
- Error rates
- Evaluation pass rate

## 9.3 Persistence

Metrics can optionally be persisted to MongoDB using `MetricLogs`.

This enables:

- Admin dashboard summaries
- Historical analysis
- Debugging slow routes
- Debugging failed background jobs
- Detecting RAG quality regressions

---

## 10. Evaluation Architecture

The evaluation framework measures whether the RAG system is working correctly.

## 10.1 Evaluation Goals

The evaluation system checks:

- Did the router choose the right intent?
- Did retrieval return useful context?
- Is the answer relevant?
- Is the answer grounded in the transcript?
- Is the answer complete?
- Was the response generated within an acceptable latency window?
- Is there hallucination risk?

## 10.2 Evaluation Categories

| Category | Purpose |
| --- | --- |
| Video overview | Tests summary-based answers |
| Specific Q&A | Tests grounded retrieval and answer quality |
| Topic overview | Tests topic-aware retrieval |
| Entity overview | Tests entity-aware retrieval |
| Timestamp query | Tests timestamp correctness |
| Action extraction | Tests content generation workflows |
| Guest summary | Tests public summary flow |
| Guest Q&A | Tests temporary guest transcript context |

## 10.3 Evaluation Metrics

| Metric | Meaning |
| --- | --- |
| Relevance | Answer matches the user question |
| Groundedness | Answer is supported by retrieved transcript context |
| Completeness | Answer includes important details |
| Latency | End-to-end response time |
| Hallucination Risk | Likelihood of unsupported output |
| Intent Pass/Fail | Whether routing matched expected mode |
| Mode Pass/Fail | Whether response type matched expected workflow |

Evaluation reports are stored in MongoDB so the system can be benchmarked across prompt, retrieval, and model changes.

---

## 11. Security Architecture

## 11.1 Authentication

The system supports:

- Local email/password login
- Password hashing
- Email verification
- Google OAuth login
- JWT-based authentication

## 11.2 Authorization

Authorization is role-based.

```text
user
admin
```

Protected routes require a valid JWT. Admin routes require both a valid JWT and `role=admin`.

## 11.3 Data Ownership

User-owned video routes validate that the video belongs to the authenticated user.

This prevents one user from accessing another user’s videos, chunks, or chat history.

## 11.4 Secret Management

Sensitive values are provided through environment variables.

Examples:

- `MONGODB_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `SUPADATA_API_KEY`
- `GOOGLE_CLIENT_ID`
- `BREVO_API_KEY`

Secrets should never be committed to the repository.

---

## 12. Architecture Tradeoffs and Scaling

## 12.1 Current Design

The current design is suitable for development, demos, portfolio use, and early-stage users.

It supports:

- Multiple authenticated users
- Guest usage
- Per-video indexing
- Admin inspection
- Evaluation workflows
- Optional metric persistence

---

## 12.2 Why MongoDB?

MongoDB works well for this project because video documents, summaries, supporting chunks, metrics, and evaluation reports are semi-structured and can evolve over time.

It also fits AI metadata such as:

- Summary objects
- Supporting chunks
- Metrics metadata
- Evaluation reports

---

## 12.3 Why FAISS?

FAISS provides fast local vector search and is a good fit for a self-contained application or portfolio project.

It enables:

- Per-video semantic indexes
- Local vector search
- Lower infrastructure complexity
- Migration path to managed vector databases later

---

## 12.4 Why Hybrid Retrieval?

Hybrid retrieval was chosen because transcript Q&A requires both semantic understanding and exact-match precision for names, products, timestamps, numbers, and short phrases.

Vector search improves meaning-based matching, while keyword/entity/topic retrieval improves precision for transcript-specific details.

---

## 12.5 Why Separate the Embedding Service?

The embedding service is separated because Python has stronger tooling for embeddings, FAISS, and AI infrastructure.

This separation improves:

- Modularity
- Maintainability
- Independent scaling
- AI infrastructure flexibility
- Future migration to managed retrieval infrastructure

---

## 12.6 Current Scaling Bottlenecks

Potential bottlenecks include:

| Area | Bottleneck |
| --- | --- |
| Background jobs | In-process jobs can be interrupted if backend restarts |
| Guest sessions | In-memory sessions are lost on restart |
| FAISS files | Local index files are tied to service storage |
| LLM calls | Latency and cost increase with usage |
| MongoDB | Large transcripts and chunks increase storage needs |
| Metrics | Persistent logs can grow quickly |

---

## 12.7 Production Improvements

Recommended improvements for production:

- Move background jobs to a queue system
- Store guest sessions in Redis
- Move vector indexes to persistent object storage or managed vector DB
- Add per-user rate limiting
- Add streaming responses
- Add centralized logging
- Add dashboard charts
- Add LLM cost tracking
- Add retries and dead-letter queues for failed jobs
- Add deployment-specific configuration profiles

---

## 13. Future Architecture Roadmap

Planned or recommended architecture improvements:

- Queue-based background processing
- Redis-backed guest sessions
- Streaming LLM responses
- Multi-video search
- Persistent vector storage
- Reranking model for retrieval
- Advanced citation highlighting
- Transcript-side context highlighting
- LLM cost analytics
- User-level rate limits
- Organization/team workspaces
- Deployment profiles for Render, Railway, Fly.io, or AWS
- CI/CD pipeline with test gates
- Automated evaluation runs after prompt or retrieval changes

---

## 14. Summary

YouTube RAG Assistant is designed as a production-aware AI application, not just a basic chatbot.

The architecture combines:

- Full-stack product workflows
- Transcript processing
- Multi-stage RAG orchestration
- Hybrid retrieval
- Structured summaries
- Semantic vector search
- Role-based admin tooling
- Observability
- Automated evaluation

This design makes the system understandable, extensible, and suitable for continued product development.
