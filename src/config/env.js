const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), process.env.NODE_ENV === 'test' ? '.env.test' : '.env') });

const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'EMBEDDING_SERVICE_URL',
  'OLLAMA_BASE_URL',
];

requiredEnvVars.forEach((key) => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const allowedNodeEnvs = ['development', 'production', 'test'];
if (!allowedNodeEnvs.includes(process.env.NODE_ENV)) {
  throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Allowed values are ${allowedNodeEnvs.join(', ')}`);
}

const llmProvider = (process.env.LLM_PROVIDER || 'ollama').trim().toLowerCase();
if (!['ollama', 'openai'].includes(llmProvider)) {
  throw new Error(`Invalid LLM_PROVIDER: ${llmProvider}. Allowed values are ollama, openai`);
}

if (llmProvider === 'openai' && !process.env.OPENAI_API_KEY?.trim()) {
  throw new Error('Missing required environment variable for OpenAI provider: OPENAI_API_KEY');
}

const port = Number.parseInt(process.env.PORT, 10);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

module.exports = {
  port,
  mongoUri: process.env.MONGODB_URI.trim(),
  nodeEnv: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL.trim(),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL.trim(),
  ollamaModel: (process.env.OLLAMA_MODEL || 'llama3').trim(),
  ollamaTimeoutMs: Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
  llmProvider,
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
  openaiModel: (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim(),
};
