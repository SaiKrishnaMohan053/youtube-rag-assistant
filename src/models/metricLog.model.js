const mongoose = require('mongoose');

const metricLogSchema = new mongoose.Schema(
  {
    level: { type: String, index: true },
    event: { type: String, index: true },
    service: { type: String, default: 'youtube-rag-backend' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('MetricLog', metricLogSchema);