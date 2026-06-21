const mongoose = require('mongoose');

const peopleSummarySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    summary: { type: String, default: '' },
    talkedAbout: [{ type: String, trim: true }],
  },
  { _id: false }
);

const topicSummarySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    summary: { type: String, default: '' },
    keyPoints: [{ type: String, trim: true }],
  },
  { _id: false }
);

const videoSummarySchema = new mongoose.Schema(
  {
    shortSummary: { type: String, default: '' },
    detailedSummary: { type: String, default: '' },
    mainTopics: [{ type: String, trim: true }],
    keyTakeaways: [{ type: String, trim: true }],
    people: [peopleSummarySchema],
    topics: [topicSummarySchema],
    generatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: null,
    },
    transcriptText: {
      type: String,
      default: '',
    },
    transcriptStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    transcriptError: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },

    summaryStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    summaryError: {
      type: String,
      default: null,
    },
    embeddingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    embeddingError: {
      type: String,
      default: null,
    },
    indexedAt: {
      type: Date,
      default: null,
    },
    summary: {
      type: videoSummarySchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

videoSchema.index({ user: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('Video', videoSchema);
