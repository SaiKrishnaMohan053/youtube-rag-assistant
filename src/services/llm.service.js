const axios = require('axios');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

const client = axios.create({
  baseURL: env.ollamaBaseUrl,
  timeout: 60000,
});

const normalizeOllamaError = (error) => {
  if (error.response) {
    const detail = error.response.data?.error || error.response.data?.message || 'Ollama request failed';
    return new ApiError(error.response.status || 502, `Ollama error: ${detail}`);
  }

  if (error.request) {
    return new ApiError(503, 'Ollama service is unreachable');
  }

  return new ApiError(500, 'Failed to generate answer with Ollama');
};

const generateAnswer = async (prompt) => {
  try {
    const payload = {
      model: env.ollamaModel,
      prompt,
      stream: false,
    };

    const { data } = await client.post('/api/generate', payload);
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

module.exports = {
  generateAnswer,
};
