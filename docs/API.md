> This document primarily describes the current implementation in the repository.  
> Sections explicitly labeled **Future Improvements**, **Recommendations**, or **Production Enhancements** describe proposed upgrades that are not yet implemented.

# API Documentation

## YouTube RAG Assistant

This document describes the public, authenticated, admin, metrics, evaluation, health, and Python embedding service APIs used by the YouTube RAG Assistant platform.

The goal of this document is to help engineers understand how the frontend, backend, and embedding service communicate without repeating system architecture details covered in `docs/ARCHITECTURE.md`.

---

## 1. API Overview

The platform exposes two API layers:

1. **Backend REST API**
   - Handles authentication, video processing, transcript chunking, RAG Q&A, guest workflows, admin inspection, metrics, evaluations, and health checks.

2. **Python Embedding Service API**
   - Handles embedding generation, FAISS indexing, semantic search, index deletion, and index status checks.

The frontend communicates primarily with the backend API. The backend communicates with the Python embedding service internally.

---

## 2. Base URLs

### Backend API

```text
http://localhost:5000/api
```

### Python Embedding Service

```text
http://localhost:8001
```

In production, these values should be configured through environment variables.

---

## 3. API Conventions

### 3.1 Content Type

All JSON APIs expect:

```http
Content-Type: application/json
```

### 3.2 Authentication Header

Protected backend routes require a Bearer token:

```http
Authorization: Bearer <jwt_token>
```

### 3.3 Standard Success Response

Most successful backend responses follow this shape:

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": {}
}
```

### 3.4 Standard Error Response

Errors are returned in a normalized format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

### 3.5 ID Convention

The backend uses two video identifiers:

| Identifier          | Usage                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| YouTube video ID    | Identifies the source video on YouTube                                       |
| MongoDB video `_id` | Used for backend routes, ownership checks, chunks, chats, and FAISS indexing |

For authenticated video routes, `:id` generally refers to the MongoDB video `_id`.

---

## 4. Authentication & Access Rules

### Public Routes

Public routes do not require a JWT.

Examples:

- Register
- Login
- Google login
- Verify email
- Guest summary
- Guest Q&A
- Health liveness/status checks

### Authenticated Routes

Authenticated routes require a valid JWT.

Examples:

- Process video
- Create chunks
- Ask questions
- View chat history
- Delete video

### Admin Routes

Admin routes require:

```text
Valid JWT + role === "admin"
```

Examples:

- Admin overview
- User inspection
- Metrics summary
- Evaluation runs

---

## 5. Auth APIs

Base path:

```text
/api/auth
```

| Method | Endpoint                  | Access        | Purpose                                           |
| ------ | ------------------------- | ------------- | ------------------------------------------------- |
| `POST` | `/register`               | Public        | Register a local user and send verification email |
| `GET`  | `/verify-email?token=...` | Public        | Verify local user email                           |
| `POST` | `/login`                  | Public        | Login with email and password                     |
| `POST` | `/google`                 | Public        | Login or register with Google credential          |
| `GET`  | `/me`                     | Authenticated | Get current authenticated user                    |

---

### 5.1 Register User

```http
POST /api/auth/register
```

#### Request

```json
{
  "name": "Sai Krishna Mohan",
  "email": "user@example.com",
  "password": "password123"
}
```

#### Behavior

- Validates required fields.
- Prevents duplicate email registration.
- Hashes password before storage.
- Generates email verification token.
- Sends verification email if email provider is configured.

#### Response

```json
{
  "statusCode": 201,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "user_id",
      "name": "Sai Krishna Mohan",
      "email": "user@example.com",
      "role": "user",
      "isEmailVerified": false
    }
  }
}
```

---

### 5.2 Verify Email

```http
GET /api/auth/verify-email?token=<verification_token>
```

#### Behavior

- Validates verification token.
- Marks user email as verified.
- Clears verification token fields.

#### Response

```json
{
  "statusCode": 200,
  "message": "Email verified successfully.",
  "data": {}
}
```

---

### 5.3 Login

```http
POST /api/auth/login
```

#### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Behavior

- Validates credentials.
- Blocks local login if email is not verified.
- Returns JWT and user profile.

#### Response

```json
{
  "statusCode": 200,
  "message": "Login successful.",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "name": "Sai Krishna Mohan",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

---

### 5.4 Google Login

```http
POST /api/auth/google
```

#### Request

```json
{
  "credential": "google_id_token"
}
```

#### Behavior

- Verifies Google credential.
- Creates user if account does not exist.
- Marks Google-authenticated users as verified.
- Returns JWT and user profile.

---

### 5.5 Current User

```http
GET /api/auth/me
```

#### Access

Authenticated

#### Response

```json
{
  "statusCode": 200,
  "message": "Current user fetched successfully.",
  "data": {
    "user": {
      "id": "user_id",
      "name": "Sai Krishna Mohan",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

---

## 6. Video APIs

Base path:

```text
/api/videos
```

All video APIs require authentication unless explicitly stated otherwise.

| Method   | Endpoint            | Purpose                                            |
| -------- | ------------------- | -------------------------------------------------- |
| `GET`    | `/embedding-health` | Check Python embedding service through backend     |
| `POST`   | `/process`          | Process YouTube URL and save transcript            |
| `GET`    | `/`                 | List current user videos                           |
| `GET`    | `/:id`              | Get one video                                      |
| `GET`    | `/:id/status`       | Get video readiness status                         |
| `POST`   | `/:id/chunks`       | Create transcript chunks and start background jobs |
| `GET`    | `/:id/chunks`       | Get transcript chunks                              |
| `POST`   | `/:id/index`        | Manually index chunks into FAISS                   |
| `GET`    | `/:id/index/status` | Get FAISS index status                             |
| `POST`   | `/:id/search`       | Run direct semantic search                         |
| `POST`   | `/:id/ask`          | Ask routed RAG question                            |
| `GET`    | `/:id/chats`        | Get chat history                                   |
| `DELETE` | `/:id`              | Delete video and related data                      |

---

### 6.1 Process YouTube Video

```http
POST /api/videos/process
```

#### Request

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "title": "Optional video title"
}
```

#### Behavior

- Extracts YouTube video ID.
- Prevents duplicate video records for the same user.
- Fetches transcript through the transcript provider.
- Stores transcript text, duration, status, and metadata in MongoDB.

#### Response

```json
{
  "statusCode": 201,
  "message": "Video processed successfully.",
  "data": {
    "video": {
      "_id": "mongo_video_id",
      "videoId": "youtube_video_id",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "transcriptStatus": "completed",
      "summaryStatus": "pending",
      "duration": 1234
    }
  }
}
```

---

### 6.2 List Videos

```http
GET /api/videos
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Videos fetched successfully.",
  "data": {
    "videos": [
      {
        "_id": "mongo_video_id",
        "videoId": "youtube_video_id",
        "title": "Video title",
        "summaryStatus": "completed",
        "transcriptStatus": "completed",
        "duration": 1234,
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 6.3 Get Video

```http
GET /api/videos/:id
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Video fetched successfully.",
  "data": {
    "video": {
      "_id": "mongo_video_id",
      "videoId": "youtube_video_id",
      "title": "Video title",
      "summaryStatus": "completed",
      "transcriptStatus": "completed",
      "summary": {}
    }
  }
}
```

---

### 6.4 Create Transcript Chunks

```http
POST /api/videos/:id/chunks
```

#### Behavior

- Validates video ownership.
- Requires completed transcript.
- Creates timestamp-aware transcript chunks.
- Persists chunks in MongoDB.
- Starts background summary and embedding jobs.

#### Response

```json
{
  "statusCode": 201,
  "message": "Chunks created successfully.",
  "data": {
    "chunkCount": 27,
    "summaryStatus": "processing",
    "embeddingStatus": "processing"
  }
}
```

---

### 6.5 Get Chunks

```http
GET /api/videos/:id/chunks
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Chunks fetched successfully.",
  "data": {
    "chunks": [
      {
        "_id": "chunk_id",
        "chunkIndex": 0,
        "text": "Transcript chunk text",
        "startTime": 12,
        "endTime": 48,
        "embeddingStatus": "completed"
      }
    ]
  }
}
```

---

### 6.6 Video Readiness Status

```http
GET /api/videos/:id/status
```

#### Purpose

Used by the frontend to determine whether a video is ready for chat.

#### Response

```json
{
  "statusCode": 200,
  "message": "Video status fetched successfully.",
  "data": {
    "ready": true,
    "message": "Video is ready for chat.",
    "summaryStatus": "completed",
    "embeddingStatus": "completed",
    "totalChunks": 27,
    "completedEmbeddings": 27,
    "failedEmbeddings": 0
  }
}
```

#### Ready Condition

```text
summaryStatus === "completed"
AND all chunks have embeddingStatus === "completed"
```

---

### 6.7 Manual Indexing

```http
POST /api/videos/:id/index
```

#### Purpose

Manually sends saved transcript chunks to the Python embedding service for indexing.

#### Response

```json
{
  "statusCode": 200,
  "message": "Video indexed successfully.",
  "data": {
    "videoId": "mongo_video_id",
    "indexed": 27,
    "model": "text-embedding-3-small"
  }
}
```

---

### 6.8 Index Status

```http
GET /api/videos/:id/index/status
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Index status fetched successfully.",
  "data": {
    "videoId": "mongo_video_id",
    "indexed": true,
    "indexFileExists": true,
    "metadataFileExists": true,
    "chunkCount": 27,
    "model": "text-embedding-3-small"
  }
}
```

---

### 6.9 Direct Semantic Search

```http
POST /api/videos/:id/search
```

#### Request

```json
{
  "query": "What did the speaker say about AI?",
  "topK": 3
}
```

#### Behavior

- Runs direct vector search against the FAISS index.
- Intended for debugging and inspection.
- Does not generate an LLM answer.

#### Response

```json
{
  "statusCode": 200,
  "message": "Search completed successfully.",
  "data": {
    "matches": [
      {
        "score": 0.82,
        "chunkId": "chunk_id",
        "chunkIndex": 4,
        "startTime": 120,
        "endTime": 160,
        "text": "Matched transcript chunk text"
      }
    ]
  }
}
```

---

### 6.10 Ask Video Question

```http
POST /api/videos/:id/ask
```

#### Request

```json
{
  "query": "Create detailed notes from this video",
  "topK": 4
}
```

#### Behavior

- Validates access to video.
- Classifies query intent.
- Selects summary, timestamp, action, or retrieval-based answer strategy.
- Retrieves supporting context when needed.
- Generates grounded answer.
- Saves chat history.

#### Response

```json
{
  "statusCode": 200,
  "message": "Answer generated successfully.",
  "data": {
    "chatMessageId": "mongo_chat_id",
    "answer": "Generated answer text",
    "supportingChunks": [
      {
        "chunkIndex": 4,
        "startTime": 120,
        "endTime": 160,
        "score": 0.82,
        "text": "Supporting transcript context"
      }
    ],
    "mode": "action_extraction",
    "intent": "ACTION_EXTRACTION",
    "entity": null,
    "topic": null,
    "actionType": "DETAILED_NOTES"
  }
}
```

#### Supported Modes

| Mode                | Meaning                        |
| ------------------- | ------------------------------ |
| `summary`           | Full video overview answer     |
| `entity_overview`   | Entity-focused answer          |
| `topic_overview`    | Topic-focused answer           |
| `timestamp_query`   | Timestamp-focused answer       |
| `action_extraction` | Notes/posts/blog/action output |
| `qa`                | Specific grounded Q&A          |

---

### 6.11 Get Chat History

```http
GET /api/videos/:id/chats
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Chat history fetched successfully.",
  "data": {
    "chats": [
      {
        "_id": "chat_id",
        "question": "What is this video about?",
        "answer": "Answer text",
        "supportingChunks": [],
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 6.12 Delete Video

```http
DELETE /api/videos/:id
```

#### Behavior

Deletes:

- Video document
- Transcript chunks
- Chat messages
- Related FAISS index and metadata files

#### Response

```json
{
  "statusCode": 200,
  "message": "Video deleted successfully.",
  "data": {}
}
```

---

## 7. Guest APIs

Base path:

```text
/api/guest
```

Guest APIs are public and do not persist video or chat history in MongoDB.

| Method | Endpoint   | Purpose                                              |
| ------ | ---------- | ---------------------------------------------------- |
| `POST` | `/summary` | Generate temporary summary from YouTube URL          |
| `POST` | `/ask`     | Ask temporary follow-up question using guest session |

---

### 7.1 Guest Summary

```http
POST /api/guest/summary
```

#### Request

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Guest summary generated successfully.",
  "data": {
    "sessionId": "guest_session_id",
    "videoId": "youtube_video_id",
    "duration": 1234,
    "summary": "Generated summary text",
    "expiresAt": 1770000000000,
    "limits": {
      "mode": "guest",
      "saved": false,
      "advancedExports": false,
      "history": false
    }
  }
}
```

---

### 7.2 Guest Ask

```http
POST /api/guest/ask
```

#### Request

```json
{
  "sessionId": "guest_session_id",
  "query": "What are the key takeaways?"
}
```

#### Behavior

- Uses temporary guest transcript context.
- Does not save chat history.
- Fails if session is missing or expired.

#### Response

```json
{
  "statusCode": 200,
  "message": "Guest answer generated successfully.",
  "data": {
    "answer": "Generated answer text",
    "sessionId": "guest_session_id",
    "saved": false
  }
}
```

---

## 8. Admin APIs

Base path:

```text
/api/admin
```

All admin routes require admin access.

| Method | Endpoint                  | Purpose                              |
| ------ | ------------------------- | ------------------------------------ |
| `GET`  | `/overview`               | Platform totals and processing state |
| `GET`  | `/users`                  | List users with usage counts         |
| `GET`  | `/users/:userId/videos`   | Inspect videos for a user            |
| `GET`  | `/videos/:videoId/chunks` | Inspect chunks and index status      |
| `POST` | `/videos/:videoId/index`  | Trigger indexing for a video         |

---

### 8.1 Admin Overview

```http
GET /api/admin/overview
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Admin overview fetched successfully.",
  "data": {
    "totalUsers": 10,
    "adminUsers": 1,
    "regularUsers": 9,
    "totalVideos": 42,
    "totalChunks": 1200,
    "summaries": {
      "completed": 38,
      "failed": 2,
      "pending": 2
    },
    "embeddings": {
      "pending": 0,
      "completed": 1180,
      "failed": 20
    }
  }
}
```

---

### 8.2 List Users

```http
GET /api/admin/users
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Users fetched successfully.",
  "data": {
    "users": [
      {
        "_id": "user_id",
        "name": "User Name",
        "email": "user@example.com",
        "role": "user",
        "authProvider": "local",
        "isEmailVerified": true,
        "videoCount": 3,
        "chunkCount": 95
      }
    ]
  }
}
```

---

### 8.3 User Videos

```http
GET /api/admin/users/:userId/videos
```

#### Response

Returns selected user details and videos owned by that user, including transcript status, summary status, duration, chunk count, and embedding counts.

---

### 8.4 Video Chunk Inspection

```http
GET /api/admin/videos/:videoId/chunks
```

#### Response

Returns video metadata, transcript chunks, embedding status counts, and FAISS index status.

---

### 8.5 Admin Trigger Indexing

```http
POST /api/admin/videos/:videoId/index
```

#### Purpose

Allows an admin to manually index or re-index a video.

---

## 9. Metrics APIs

Base path:

```text
/api/metrics
```

All metrics routes require admin access.

| Method | Endpoint   | Purpose                               |
| ------ | ---------- | ------------------------------------- |
| `GET`  | `/summary` | Fetch recent platform metrics summary |

---

### 9.1 Metrics Summary

```http
GET /api/metrics/summary
```

#### Response

```json
{
  "statusCode": 200,
  "message": "Metrics summary fetched successfully.",
  "data": {
    "window": "24h",
    "eventCounts": [],
    "recentErrors": [],
    "slowestRoutes": []
  }
}
```

#### Typical Metrics

- Event counts by type
- Recent errors
- Slow HTTP routes
- LLM latency
- Embedding/search performance
- RAG answer metrics

---

## 10. Evaluation APIs

Base path:

```text
/api/evals
```

All evaluation routes require admin access.

| Method | Endpoint             | Purpose                           |
| ------ | -------------------- | --------------------------------- |
| `GET`  | `/stats`             | Aggregated evaluation statistics  |
| `GET`  | `/reports`           | List saved evaluation reports     |
| `GET`  | `/reports/:fileName` | Fetch one saved evaluation report |
| `POST` | `/run`               | Run evaluation suite              |

---

### 10.1 Run Evaluation Suite

```http
POST /api/evals/run
```

#### Request

```json
{
  "videoId": "mongo_video_id",
  "guestUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

#### Behavior

- Requires `videoId`.
- Runs authenticated evaluation cases for the selected video.
- Runs guest evaluation cases when `guestUrl` is provided.
- Saves report to MongoDB.

#### Response

```json
{
  "statusCode": 200,
  "message": "Evaluation completed successfully.",
  "data": {
    "report": {
      "total": 8,
      "passed": 7,
      "failed": 1,
      "passRate": 87.5
    }
  }
}
```

---

### 10.2 List Evaluation Reports

```http
GET /api/evals/reports
```

#### Response

Returns saved evaluation report summaries.

---

### 10.3 Get Evaluation Report

```http
GET /api/evals/reports/:fileName
```

#### Response

Returns the selected evaluation report.

---

### 10.4 Evaluation Stats

```http
GET /api/evals/stats
```

#### Response

Returns aggregate evaluation statistics, such as total runs, pass rate, and recent reports.

---

## 11. Health APIs

Base path:

```text
/api/health
```

| Method | Endpoint  | Access | Purpose                                 |
| ------ | --------- | ------ | --------------------------------------- |
| `GET`  | `/live`   | Public | Basic liveness check                    |
| `GET`  | `/status` | Public | Backend readiness and dependency status |
| `GET`  | `/deep`   | Public | Embedding service connectivity check    |

---

### 11.1 Liveness

```http
GET /api/health/live
```

#### Response

```json
{
  "status": "live",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptimeSeconds": 120
}
```

---

### 11.2 Readiness Status

```http
GET /api/health/status
```

#### Response

```json
{
  "status": "ready",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptimeSeconds": 120,
  "environment": "development",
  "mongo": {
    "status": "connected"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4.1-mini"
  },
  "memory": {}
}
```

---

### 11.3 Deep Health

```http
GET /api/health/deep
```

#### Behavior

Calls the Python embedding service health endpoint and returns whether the service is reachable.

---

## 12. Python Embedding Service APIs

Base URL:

```text
http://localhost:8001
```

These endpoints are primarily used by the backend service.

| Method   | Endpoint                          | Purpose                                 |
| -------- | --------------------------------- | --------------------------------------- |
| `GET`    | `/health`                         | Service health and embedding model info |
| `POST`   | `/embed`                          | Generate embeddings for raw texts       |
| `POST`   | `/index-video`                    | Build FAISS index for one video         |
| `POST`   | `/search`                         | Search FAISS index for one video        |
| `GET`    | `/videos/{video_id}/index/status` | Check index status                      |
| `DELETE` | `/videos/{video_id}/index`        | Delete index and metadata               |

---

### 12.1 Embedding Service Health

```http
GET /health
```

#### Response

```json
{
  "status": "ok",
  "model": "text-embedding-3-small"
}
```

---

### 12.2 Embed Texts

```http
POST /embed
```

#### Request

```json
{
  "texts": ["text one", "text two"]
}
```

#### Response

```json
{
  "count": 2,
  "embeddings": [[0.1, 0.2, 0.3]]
}
```

---

### 12.3 Index Video

```http
POST /index-video
```

#### Request

```json
{
  "videoId": "mongo_video_id",
  "chunks": [
    {
      "chunkId": "chunk_id",
      "text": "Transcript chunk text",
      "chunkIndex": 0,
      "startTime": 0,
      "endTime": 30
    }
  ]
}
```

#### Response

```json
{
  "videoId": "mongo_video_id",
  "indexed": 1,
  "model": "text-embedding-3-small"
}
```

---

### 12.4 Search Index

```http
POST /search
```

#### Request

```json
{
  "videoId": "mongo_video_id",
  "query": "What did the speaker say about AI?",
  "topK": 5
}
```

#### Response

```json
{
  "videoId": "mongo_video_id",
  "query": "What did the speaker say about AI?",
  "topK": 5,
  "matches": [
    {
      "score": 0.82,
      "chunkId": "chunk_id",
      "chunkIndex": 0,
      "startTime": 0,
      "endTime": 30,
      "text": "Matched chunk text"
    }
  ]
}
```

---

### 12.5 Index Status

```http
GET /videos/{video_id}/index/status
```

#### Response

```json
{
  "videoId": "mongo_video_id",
  "indexed": true,
  "indexFileExists": true,
  "metadataFileExists": true,
  "chunkCount": 27,
  "model": "text-embedding-3-small"
}
```

---

### 12.6 Delete Index

```http
DELETE /videos/{video_id}/index
```

#### Response

```json
{
  "videoId": "mongo_video_id",
  "deleted": true
}
```

---

## 13. Error Handling

### Common Status Codes

| Status Code | Meaning                           |
| ----------- | --------------------------------- |
| `200`       | Request completed successfully    |
| `201`       | Resource created successfully     |
| `400`       | Invalid request or missing fields |
| `401`       | Missing or invalid authentication |
| `403`       | Authenticated but not authorized  |
| `404`       | Resource not found                |
| `409`       | Duplicate or conflicting resource |
| `500`       | Internal server error             |

### Example Validation Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "url",
      "message": "YouTube URL is required."
    }
  ]
}
```

### Example Authorization Error

```json
{
  "success": false,
  "message": "You are not authorized to access this resource.",
  "errors": []
}
```

---

## 14. Important Business Rules

### Video Ownership

Authenticated users can only access their own videos, chunks, chats, and processing state.

### Admin Access

Admins can inspect platform-level data and trigger operational actions such as indexing.

### Guest Sessions

Guest sessions are temporary and not persisted as user history.

### RAG Readiness

A video should be considered ready for RAG chat only when both summary generation and embedding indexing are complete.

### Index Cleanup

When a video is deleted, related MongoDB data and FAISS index files should be cleaned up together.

---

## 15. Future API Improvements

Recommended improvements for production API maturity:

- Add request rate limiting
- Add pagination for list endpoints
- Add API versioning such as `/api/v1`
- Add OpenAPI/Swagger documentation
- Add idempotency keys for long-running processing jobs
- Add streaming responses for chat answers
- Add structured error codes
- Add cursor-based pagination for chats and metrics
- Add webhook support for background job completion

---

## 16. Summary

The API layer is designed to support the complete YouTube RAG Assistant workflow:

- Authentication
- Video processing
- Transcript chunking
- Semantic indexing
- Grounded RAG Q&A
- Guest access
- Admin inspection
- Monitoring
- Evaluation

The backend API acts as the main product interface, while the Python embedding service provides specialized vector search capabilities behind the scenes.
