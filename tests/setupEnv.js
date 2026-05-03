process.env.PORT = "5000";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/youtube_rag_test";
process.env.JWT_SECRET = "test_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.EMBEDDING_SERVICE_URL = "http://127.0.0.1:8001";
process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
process.env.OLLAMA_MODEL = "llama3";