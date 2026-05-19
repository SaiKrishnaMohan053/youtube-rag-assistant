const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAndSaveVideoSummary } = require('./summary.service');
const { indexVideoEmbeddings } = require('./embeddingClient.service');
const { logInfo, logError } = require('../utils/logger');

const buildEmbeddingPayload = ({ video, chunks }) => ({
  videoId: video._id.toString(),
  chunks: chunks.map((chunk) => ({
    chunkId: chunk._id.toString(),
    text: chunk.text,
    chunkIndex: chunk.chunkIndex,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
  })),
});

const runVideoPostChunkJobs = async ({ video, userId }) => {
  const startedAt = Date.now();

  try {
    logInfo('video.post_chunk_jobs.started', {
      userId: userId.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
    });

    await generateAndSaveVideoSummary(video);

    const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 });

    const payload = buildEmbeddingPayload({
      video,
      chunks,
    });

    await indexVideoEmbeddings(payload);

    await TranscriptChunk.updateMany(
      { video: video._id },
      {
        $set: {
          embeddingStatus: 'completed',
          embeddingError: null,
        },
      }
    );

    logInfo('video.post_chunk_jobs.completed', {
      userId: userId.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      chunkCount: chunks.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    await TranscriptChunk.updateMany(
      { video: video._id },
      {
        $set: {
          embeddingStatus: 'failed',
          embeddingError: error.message || 'Background processing failed',
        },
      }
    );

    logError('video.post_chunk_jobs.failed', {
      userId: userId.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
  }
};

const startVideoPostChunkJobs = ({ video, userId }) => {
  setImmediate(() => {
    runVideoPostChunkJobs({ video, userId }).catch((error) => {
      logError('video.post_chunk_jobs.unhandled', {
        userId: userId.toString(),
        videoMongoId: video._id.toString(),
        youtubeVideoId: video.videoId,
        error: error.message,
      });
    });
  });
};

module.exports = {
  startVideoPostChunkJobs,
  runVideoPostChunkJobs,
};
