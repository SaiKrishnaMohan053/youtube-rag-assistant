const axios = require('axios');
const OpenAI = require('openai');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

const ollamaClient = axios.create({
  baseURL: env.ollamaBaseUrl,
  timeout: env.ollamaTimeoutMs,
});

const openaiClient = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

const normalizeOllamaError = (error) => {
  if (error.response) {
    const detail =
      error.response.data?.error || error.response.data?.message || 'Ollama request failed';
    return new ApiError(error.response.status || 502, `Ollama error: ${detail}`);
  }
  if (error.code === 'ECONNABORTED') {
    return new ApiError(504, `Ollama request timed out after ${env.ollamaTimeoutMs}ms`);
  }
  if (error.request) {
    return new ApiError(503, 'Ollama service is unreachable');
  }
  return new ApiError(500, 'Failed to generate answer with Ollama');
};

const generateWithOllama = async (prompt) => {
  try {
    const payload = {
      model: env.ollamaModel,
      prompt,
      stream: false,
      options: {
        num_predict: 180,
        temperature: 0.2,
      },
    };

    const { data } = await ollamaClient.post('/api/generate', payload);
    const answer = data?.response;
    if (!answer || typeof answer !== 'string') {
      throw new ApiError(502, 'Ollama returned an invalid response');
    }
    return answer.trim();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw normalizeOllamaError(error);
  }
};

const generateWithOpenAI = async (prompt) => {
  if (!openaiClient) {
    throw new ApiError(500, 'OpenAI client is not configured');
  }

  try {
    const response = await openaiClient.responses.create({
      model: env.openaiModel,
      input: prompt,
    });

    const answer = response.output_text?.trim();
    if (!answer) {
      throw new ApiError(502, 'OpenAI returned an empty response');
    }
    return answer;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error?.message || 'Failed to generate answer with OpenAI';
    throw new ApiError(502, `OpenAI error: ${message}`);
  }
};

const generateAnswer = async (prompt) => {
  if (env.llmProvider === 'openai') {
    return generateWithOpenAI(prompt);
  }
  return generateWithOllama(prompt);
};

module.exports = {
  generateAnswer,
  generateWithOllama,
  generateWithOpenAI,
};
