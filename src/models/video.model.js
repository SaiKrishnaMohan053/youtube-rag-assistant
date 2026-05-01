const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

videoSchema.index({ user: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('Video', videoSchema);
