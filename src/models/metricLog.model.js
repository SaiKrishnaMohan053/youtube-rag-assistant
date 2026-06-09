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

metricLogSchema.index({ event: 1, createdAt: -1 });
metricLogSchema.index({ level: 1, createdAt: -1 });
metricLogSchema.index({ event: 1, 'meta.durationMs': -1, createdAt: -1 });

module.exports = mongoose.model('MetricLog', metricLogSchema);
