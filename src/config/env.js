const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(process.cwd(), process.env.NODE_ENV === 'test' ? '.env.test' : '.env'),
});

const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'EMBEDDING_SERVICE_URL',
];

requiredEnvVars.forEach((key) => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const allowedNodeEnvs = ['development', 'production', 'test'];
if (!allowedNodeEnvs.includes(process.env.NODE_ENV)) {
  throw new Error(
    `Invalid NODE_ENV: ${process.env.NODE_ENV}. Allowed values are ${allowedNodeEnvs.join(', ')}`
  );
}

const llmProvider = (process.env.LLM_PROVIDER || 'ollama').trim().toLowerCase();
if (!['ollama', 'openai'].includes(llmProvider)) {
  throw new Error(`Invalid LLM_PROVIDER: ${llmProvider}. Allowed values are ollama, openai`);
}

if (llmProvider === 'ollama' && !process.env.OLLAMA_BASE_URL?.trim()) {
  throw new Error('Missing required environment variable for Ollama provider: OLLAMA_BASE_URL');
}

if (llmProvider === 'openai' && !process.env.OPENAI_API_KEY?.trim()) {
  throw new Error('Missing required environment variable for OpenAI provider: OPENAI_API_KEY');
}

const port = Number.parseInt(process.env.PORT, 10);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI.trim(),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL.trim(),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim(),
  ollamaModel: (process.env.OLLAMA_MODEL || 'llama3').trim(),
  ollamaTimeoutMs: Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
  llmProvider,
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
  openaiModel: (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim(),
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').trim(),
  smtpHost: process.env.SMTP_HOST?.trim() || '',
  smtpPort: Number.parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER?.trim() || '',
  smtpPass: process.env.SMTP_PASS?.trim() || '',
  resendApiKey: process.env.RESEND_API_KEY?.trim() || '',
  emailFrom: process.env.EMAIL_FROM?.trim() || 'YouTube RAG Assistant <no-reply@example.com>',
};
