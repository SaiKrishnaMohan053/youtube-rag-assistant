const axios = require('axios');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

const client = axios.create({
  baseURL: env.embeddingServiceUrl,
  timeout: 30000,
});

const normalizeAxiosError = (error, fallbackMessage) => {
  if (error.response) {
    const detail = error.response.data?.detail || error.response.data?.message || fallbackMessage;
    return new ApiError(error.response.status || 502, `Embedding service error: ${detail}`);
  }
  if (error.request) {
    return new ApiError(503, 'Embedding service is unreachable');
  }
  return new ApiError(500, fallbackMessage);
};

const getEmbeddingHealth = async () => {
  try {
    const { data } = await client.get('/health');
    return data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Failed to check embedding service health');
  }
};

const indexVideoEmbeddings = async (payload) => {
  try {
    const { data } = await client.post('/index-video', payload);
    return data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Failed to index video embeddings');
  }
};

const searchVideoEmbeddings = async (payload) => {
  try {
    const { data } = await client.post('/search', payload);
    return data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Failed to search video embeddings');
  }
};

module.exports = {
  getEmbeddingHealth,
  indexVideoEmbeddings,
  searchVideoEmbeddings,
};
