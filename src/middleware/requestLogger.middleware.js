const { logMetric, getDurationMs } = require('../utils/logger');

const getUserType = (req) => {
  if (req.user?._id) return 'auth';
  if (req.path.includes('/guest')) return 'guest';
  return 'anonymous';
};

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    logMetric('http.request.completed', {
      method: req.method,
      route: req.route?.path || req.originalUrl,
      path: req.originalUrl,
      statusCode,
      status: isError ? 'error' : 'success',
      durationMs: getDurationMs(startedAt),
      userType: getUserType(req),
      userId: req.user?._id?.toString?.() || null,
      ip: req.ip,
    });
  });

  next();
};

module.exports = requestLogger;
