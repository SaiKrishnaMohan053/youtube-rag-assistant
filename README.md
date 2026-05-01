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
