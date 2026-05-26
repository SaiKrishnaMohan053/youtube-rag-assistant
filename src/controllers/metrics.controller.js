const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const MetricLog = require('../models/metricLog.model');

const getMetricsSummary = asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [byEvent, errors, slowRoutes] = await Promise.all([
    MetricLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    MetricLog.find({
      createdAt: { $gte: since },
      $or: [{ level: 'error' }, { 'meta.status': 'error' }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),

    MetricLog.find({
      event: 'http.request.completed',
      createdAt: { $gte: since },
      'meta.durationMs': { $exists: true },
    })
      .sort({ 'meta.durationMs': -1 })
      .limit(10)
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(200, 'Metrics summary fetched successfully', {
      window: '24h',
      byEvent,
      recentErrors: errors,
      slowRoutes,
    })
  );
});

module.exports = {
  getMetricsSummary,
};
