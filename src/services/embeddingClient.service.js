const axios = require('axios');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { logMetric, logError, getDurationMs } = require('../utils/logger');

const client = axios.create({
  baseURL: env.embeddingServiceUrl,
  timeout: 5000,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForEmbeddingServiceReady = async ({ maxAttempts = 8, delayMs = 5000 } = {}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const health = await getEmbeddingHealth();

      logMetric('embedding.wait.ready', {
        attempt,
        maxAttempts,
        status: 'success',
      });

      return health;
    } catch (error) {
      lastError = error;

      logError('embedding.wait.retry', {
        attempt,
        maxAttempts,
        delayMs,
        error: error.message,
      });

      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new ApiError(503, 'Embedding service is not ready');
};

const getEmbeddingHealth = async () => {
  const startedAt = Date.now();

  try {
    const { data } = await client.get('/health');
    logMetric('embedding.health.completed', {
      durationMs: getDurationMs(startedAt),
      status: 'success',
    });
    return data;
  } catch (error) {
    logError('embedding.health.failed', {
      durationMs: getDurationMs(startedAt),
      error: error.message,
    });
    throw normalizeAxiosError(error, 'Failed to check embedding service health');
  }
};

const indexVideoEmbeddings = async (payload, options = {}) => {
  const startedAt = Date.now();

  try {
    if (options.waitForReady) {
      await waitForEmbeddingServiceReady({
        maxAttempts: options.maxAttempts || 8,
        delayMs: options.delayMs || 5000,
      });
    }
    const { data } = await client.post('/index-video', payload);

    logMetric('embedding.index.completed', {
      durationMs: getDurationMs(startedAt),
      videoId: payload.videoId,
      chunkCount: payload.chunks.length || 0,
      status: 'success',
    });

    return data;
  } catch (error) {
    logError('embedding.index.failed', {
      durationMs: getDurationMs(startedAt),
      videoId: payload.videoId,
      chunkCount: payload.chunks.length || 0,
      error: error.message,
    });

    throw normalizeAxiosError(error, 'Failed to index video embeddings');
  }
};

const searchVideoEmbeddings = async (payload) => {
  const startedAt = Date.now();

  try {
    const { data } = await client.post('/search', payload);
    logMetric('embedding.search.completed', {
      durationMs: getDurationMs(startedAt),
      videoId: payload.videoId,
      topK: payload.topK,
      matchCount: data.matches?.length || 0,
      status: 'success',
    });
    return data;
  } catch (error) {
    logError('embedding.search.failed', {
      durationMs: getDurationMs(startedAt),
      videoId: payload.videoId,
      topK: payload.topK,
      error: error.message,
    });
    throw normalizeAxiosError(error, 'Failed to search video embeddings');
  }
};

const getVideoIndexStatus = async (videoId) => {
  try {
    const { data } = await client.get(`/videos/${videoId}/index/status`);
    return data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Failed to fetch video index status');
  }
};

module.exports = {
  getEmbeddingHealth,
  waitForEmbeddingServiceReady,
  indexVideoEmbeddings,
  searchVideoEmbeddings,
  getVideoIndexStatus,
};
