const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

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
  throw new Error(
    `Invalid NODE_ENV: ${process.env.NODE_ENV}. Allowed values are ${allowedNodeEnvs.join(', ')}`
  );
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
};
