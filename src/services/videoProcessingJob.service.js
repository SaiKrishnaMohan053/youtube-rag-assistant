const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAndSaveVideoSummary } = require('./summary.service');
const { indexVideoEmbeddings } = require('./embeddingClient.service');
const { logInfo, logError, logMetric, getDurationMs } = require('../utils/logger');
const { stat } = require('node:fs');

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

  const baseMeta = {
    userId: userId.toString(),
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    jobType: 'video_post_chunk_jobs',
  };

  try {
    logInfo('video.post_chunk_jobs.started', baseMeta);

    const summaryStartedAt = Date.now();

    await generateAndSaveVideoSummary(video);

    logMetric('video.summary_job.completed', {
      ...baseMeta,
      durationMs: getDurationMs(summaryStartedAt),
      status: 'success',
    });

    const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 });

    const payload = buildEmbeddingPayload({
      video,
      chunks,
    });

    const embeddingStartedAt = Date.now();

    await indexVideoEmbeddings(payload);

    logMetric('video.embedding_job.completed', {
      ...baseMeta,
      chunkCount: chunks.length,
      durationMs: getDurationMs(embeddingStartedAt),
      status: 'success',
    });

    await TranscriptChunk.updateMany(
      { video: video._id },
      {
        $set: {
          embeddingStatus: 'completed',
          embeddingError: null,
        },
      }
    );

    logMetric('video.post_chunk_jobs.completed', {
      ...baseMeta,
      chunkCount: chunks.length,
      durationMs: getDurationMs(startedAt),
      summaryStatus: 'completed',
      embeddingStatus: 'completed',
      status: 'success',
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
      ...baseMeta,
      durationMs: getDurationMs(startedAt),
      summaryStatus: 'unknown',
      embeddingStatus: 'failed',
      status: 'failed',
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
        jobType: 'video_post_chunk_jobs',
        status: 'failed',
        error: error.message,
      });
    });
  });
};

module.exports = {
  startVideoPostChunkJobs,
  runVideoPostChunkJobs,
};
