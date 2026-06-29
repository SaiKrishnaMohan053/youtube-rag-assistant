const mongoose = require('mongoose');

const evalReportSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      index: true,
    },
    total: { type: Number, default: 0 },
    evaluated: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
    results: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

evalReportSchema.index({ generatedAt: -1 });
evalReportSchema.index({ videoId: 1, generatedAt: -1 });

module.exports = mongoose.model('EvalReport', evalReportSchema);
