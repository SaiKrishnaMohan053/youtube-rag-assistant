> This document primarily describes the current implementation in the repository.  
> Sections explicitly labeled **Future Improvements**, **Recommendations**, or **Production Enhancements** describe proposed upgrades that are not yet implemented.

# Environment Configuration Documentation

## YouTube RAG Assistant

This document describes all environment variables required to run YouTube RAG Assistant across development and production environments.

The application consists of three independently configurable services:

* Frontend (React + Vite)
* Backend API (Node.js + Express)
* Python Embedding Service (FastAPI + FAISS)

Each service maintains its own environment configuration.

---

# 1. Configuration Goals

Environment variables are used to externalize configuration so the application can run across multiple environments without code changes.

Supported environments:

```text id="c8cwyh"
development
test
production
```

Environment configuration controls:

* Ports
* Database connections
* Authentication secrets
* AI provider selection
* External API credentials
* Email services
* Logging behavior
* Evaluation configuration

---

# 2. Configuration Architecture

```text id="yfnqra"
Frontend (.env)
      |
      v
Backend API (.env)
      |
      +--> MongoDB
      +--> LLM Provider
      +--> Transcript Provider
      +--> Email Provider
      |
      v
Python Embedding Service (.env)
      |
      +--> OpenAI Embeddings
      +--> FAISS Storage
```

---

# 3. Backend Environment Variables

Backend configuration powers the core application.

---

## 3.1 Core Application Variables

| Variable                | Required | Purpose                   |
| ----------------------- | -------- | ------------------------- |
| `PORT`                  | Yes      | Backend server port       |
| `NODE_ENV`              | Yes      | Runtime environment       |
| `MONGODB_URI`           | Yes      | MongoDB connection string |
| `JWT_SECRET`            | Yes      | JWT signing secret        |
| `JWT_EXPIRES_IN`        | Yes      | Token expiry duration     |
| `EMBEDDING_SERVICE_URL` | Yes      | Python service URL        |

Example:

```env id="3e4yxa"
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/youtube_rag_assistant
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=7d
EMBEDDING_SERVICE_URL=http://localhost:8001
```

---

## 3.2 LLM Provider Variables

The backend supports multiple LLM providers.

Supported providers:

```text id="j5jvnp"
openai
ollama
```

| Variable            | Required    | Purpose             |
| ------------------- | ----------- | ------------------- |
| `LLM_PROVIDER`      | Optional    | Active LLM provider |
| `OPENAI_API_KEY`    | Conditional | Required for OpenAI |
| `OPENAI_MODEL`      | Optional    | OpenAI model        |
| `OLLAMA_BASE_URL`   | Conditional | Ollama server URL   |
| `OLLAMA_MODEL`      | Optional    | Ollama model        |
| `OLLAMA_TIMEOUT_MS` | Optional    | Request timeout     |

Example using OpenAI:

```env id="80i86c"
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Example using Ollama:

```env id="crqf4m"
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_MS=120000
```

---

## 3.3 Transcript Provider Variables

Transcript ingestion uses external transcript APIs.

| Variable           | Required | Purpose                     |
| ------------------ | -------- | --------------------------- |
| `SUPADATA_API_KEY` | Yes      | Transcript provider API key |

Example:

```env id="0tq1lh"
SUPADATA_API_KEY=your_supadata_api_key
```

---

## 3.4 Authentication Variables

OAuth and authentication configuration.

| Variable           | Required | Purpose      |
| ------------------ | -------- | ------------ |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth |
| `CLIENT_URL`       | Optional | Frontend URL |

Example:

```env id="u0tb18"
GOOGLE_CLIENT_ID=your_google_client_id
CLIENT_URL=http://localhost:5173
```

---

## 3.5 Email Service Variables

Email verification for local authentication uses an external email provider.

| Variable        | Required | Purpose                |
| --------------- | -------- | ---------------------- |
| `BREVO_API_KEY` | Optional | Email provider API key |
| `EMAIL_FROM`    | Optional | Sender email identity  |

Example:

```env id="5mhmrm"
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=YouTube RAG Assistant <noreply@example.com>
```

If these variables are missing, email verification functionality will be disabled.

---

## 3.6 Monitoring Variables

Controls metrics persistence.

| Variable          | Required | Purpose                 |
| ----------------- | -------- | ----------------------- |
| `PERSIST_METRICS` | Optional | Persist logs to MongoDB |

Example:

```env id="klx8qo"
PERSIST_METRICS=true
```

If disabled, logs remain console-only.

---

## 3.7 Evaluation Variables

Configuration for evaluation workflows.

| Variable        | Required | Purpose                      |
| --------------- | -------- | ---------------------------- |
| `EVAL_BASE_URL` | Optional | Base URL used by eval runner |

Example:

```env id="gl84ho"
EVAL_BASE_URL=http://localhost:5000
```

---

# 4. Frontend Environment Variables

The frontend uses Vite environment variables.

| Variable            | Required | Purpose              |
| ------------------- | -------- | -------------------- |
| `VITE_API_BASE_URL` | Optional | Backend API base URL |

Example:

```env id="zpw5d3"
VITE_API_BASE_URL=http://localhost:5000/api
```

This variable allows frontend deployments to target different backend environments.

Examples:

* Local backend
* Staging backend
* Production backend

---

# 5. Python Embedding Service Variables

The Python embedding service maintains separate configuration.

---

## 5.1 Embedding Variables

| Variable              | Required    | Purpose                           |
| --------------------- | ----------- | --------------------------------- |
| `OPENAI_API_KEY`      | Conditional | Required unless test mode enabled |
| `FAISS_INDEX_DIR`     | Optional    | Vector storage directory          |
| `EMBEDDING_TEST_MODE` | Optional    | Use deterministic fake embeddings |

Example:

```env id="6d33o4"
OPENAI_API_KEY=your_openai_api_key
FAISS_INDEX_DIR=./vector_store
EMBEDDING_TEST_MODE=false
```

---

## 5.2 FAISS Storage

The embedding service stores vector indexes on disk.

Default directory:

```text id="f3l0vl"
vector_store/
```

Stored files per video:

```text id="0dzkhl"
videoMongoId.index
videoMongoId.metadata.json
```

These files contain:

* FAISS index vectors
* Chunk metadata
* Model information
* Chunk count

---

# 6. Environment Setup by Service

Recommended local setup:

```text id="j8xk7d"
project-root/
├── .env
├── client/
│   └── .env
└── services/
    └── embedding-service/
        └── .env
```

This keeps configuration isolated by service.

---

# 7. Development Configuration

Recommended local development configuration:

### Backend

```env id="bx4kl2"
NODE_ENV=development
PORT=5000
```

### Frontend

```env id="9n44ys"
VITE_API_BASE_URL=http://localhost:5000/api
```

### Embedding Service

```env id="q3mcmx"
FAISS_INDEX_DIR=./vector_store
```

Development priorities:

* Easy debugging
* Local service communication
* Fast iteration

---

# 8. Production Recommendations

Recommended production configuration:

### Security

* Use strong JWT secrets
* Rotate API keys
* Restrict CORS
* Never expose secrets to frontend

### Reliability

* Use managed MongoDB clusters
* Use persistent vector storage
* Enable metrics persistence

### Scalability

* Externalize configuration using deployment secrets
* Use separate dev/staging/prod environments
* Configure provider-specific rate limits

---

# 9. Secret Management Best Practices

Sensitive values include:

* JWT secrets
* Database URIs
* API keys
* OAuth credentials
* Email provider credentials

Best practices:

### Never Commit Secrets

Do not commit `.env` files to version control.

Use:

```gitignore id="rj8s0z"
.env
client/.env
services/embedding-service/.env
```

### Use Secret Managers in Production

Examples:

* [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/?utm_source=chatgpt.com)
* [HashiCorp Vault](https://www.vaultproject.io/?utm_source=chatgpt.com)
* [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/?utm_source=chatgpt.com)

---

# 10. Common Configuration Errors

Common setup issues:

### Invalid MongoDB URI

Symptoms:

* Backend startup failure
* Database connection errors

### Missing OpenAI Key

Symptoms:

* Embedding failures
* LLM generation failures

### Wrong Embedding Service URL

Symptoms:

* Search failures
* Indexing failures

Example:

```text id="qtnotd"
ECONNREFUSED http://localhost:8001
```

### Wrong Frontend API URL

Symptoms:

* CORS errors
* Failed API requests

---

# 11. Summary

The environment configuration system enables YouTube RAG Assistant to run consistently across development and production environments.

Configuration is separated across:

* Frontend
* Backend
* Python embedding service

This separation improves:

* Security
* Deployment flexibility
* Service isolation
* Operational reliability
