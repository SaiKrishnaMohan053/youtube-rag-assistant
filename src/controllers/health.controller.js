const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const getMongoStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return states[mongoose.connection.readyState] || 'unknown';
};

const getMemoryUsage = () => {
  const memory = process.memoryUsage();

  return {
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    externalMb: Math.round(memory.external / 1024 / 1024),
  };
};

const getHealthStatus = asyncHandler(async (_req, res) => {
  const mongoStatus = getMongoStatus();

  const ready = mongoStatus === 'connected';

  return res.status(ready ? 200 : 503).json(
    new ApiResponse(ready ? 200 : 503, ready ? 'Service is healthy' : 'Service is degraded', {
      status: ready ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: env.nodeEnv,
      database: {
        mongo: mongoStatus,
      },
      llm: {
        provider: env.llmProvider,
        model: env.llmProvider === 'openai' ? env.openaiModel : env.ollamaModel,
      },
      memory: getMemoryUsage(),
    })
  );
});

const getLiveStatus = asyncHandler(async (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, 'Service is live', {
      status: 'live',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    })
  );
});

module.exports = {
  getHealthStatus,
  getLiveStatus,
};
