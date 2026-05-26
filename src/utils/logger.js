const safeMeta = (meta = {}) =>
  JSON.parse(
    JSON.stringify(meta, (_key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
        };
      }
      return value;
    })
  );

const persistLog = async (payload) => {
  try {
    if (String(process.env.PERSIST_METRICS).toLowerCase() !== 'true') return;

    const MetricLog = require('../models/metricLog.model');

    await MetricLog.create({
      level: payload.level,
      event: payload.event,
      service: payload.service,
      meta: payload,
      createdAt: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    });
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Metric persistence failed:', error.message);
    }
  }
};

const writeLog = (level, event, meta = {}) => {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    service: 'youtube-rag-backend',
    ...safeMeta(meta),
  };

  const line = JSON.stringify(payload);

  if (level === 'error') console.error(line);
  else console.log(line);

  persistLog(payload);
};

const logInfo = (event, meta = {}) => writeLog('info', event, meta);
const logError = (event, meta = {}) => writeLog('error', event, meta);
const logMetric = (event, meta = {}) => writeLog('metric', event, meta);

const getDurationMs = (startedAt) => Date.now() - startedAt;

module.exports = {
  logInfo,
  logError,
  logMetric,
  getDurationMs,
};
