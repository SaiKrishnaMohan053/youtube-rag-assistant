const mongoose = require('mongoose');

const transcriptChunkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Number,
      default: null,
    },
    endTime: {
      type: Number,
      default: null,
    },
    tokenEstimate: {
      type: Number,
      default: null,
    },
    embeddingStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    embeddingError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

transcriptChunkSchema.index({ video: 1, chunkIndex: 1 }, { unique: true });
transcriptChunkSchema.index({ user: 1, video: 1 });
transcriptChunkSchema.index({ embeddingStatus: 1 });

module.exports = mongoose.model('TranscriptChunk', transcriptChunkSchema);
