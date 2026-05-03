# YouTube RAG Assistant Backend

## Local development (Node API + Python Embedding Service)

### First-time Python setup (PowerShell)

```powershell
cd services/embedding-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Start both services from project root

```powershell
npm run dev
```

## Useful scripts

- `npm run dev` - start Node API and embedding service together.
- `npm run dev:api` - start only Node API (`nodemon src/server.js`).
- `npm run dev:embedding` - start only embedding service from `services/embedding-service` using `.venv/Scripts/python.exe` on port `8001`.
- `npm start` - start Node API in production mode.
- `npm run test` - run Node test suite (Jest + Supertest).
- `npm run check` - run Node syntax checks across `src/**/*.js`.
- `npm run audit` - run npm vulnerability audit.

## Local test commands

```powershell
npm install
npm run check
npm run test
pytest services/embedding-service/tests
```

## CI

GitHub Actions runs on pushes and pull requests to `main`:

- Node job: `npm ci`, `npm run check`, `npm test`
- Python job: installs embedding-service deps and runs `pytest services/embedding-service/tests`

## Full manual testing prerequisites

For end-to-end local manual testing you should run:

- MongoDB
- Python embedding service (FastAPI)
- Ollama service (local model, e.g. `llama3`)
