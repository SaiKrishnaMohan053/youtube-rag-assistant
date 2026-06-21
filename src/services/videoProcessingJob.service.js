const Video = require('../models/video.model');
const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAndSaveVideoSummary } = require('./summary.service');
const { indexVideoEmbeddings } = require('./embeddingClient.service');
const { logInfo, logError, logMetric, getDurationMs } = require('../utils/logger');

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

const buildVideoEmbeddingUpdate = (status, error = null) => {
  const update = {
    embeddingStatus: status,
    embeddingError: error,
  };

  if (status === 'processing') update.indexedAt = null;
  if (status === 'completed') update.indexedAt = new Date();

  return update;
};

const buildChunkEmbeddingUpdate = (status, error = null) => ({
  embeddingStatus: status,
  embeddingError: error,
});

const setVideoEmbeddingStatus = async (videoId, status, error = null) => {
  await Video.updateOne({ _id: videoId }, { $set: buildVideoEmbeddingUpdate(status, error) });
};

const setVideoAndChunksEmbeddingStatus = async (videoId, status, error = null) => {
  await Promise.all([
    Video.updateOne({ _id: videoId }, { $set: buildVideoEmbeddingUpdate(status, error) }),
    TranscriptChunk.updateMany(
      { video: videoId },
      { $set: buildChunkEmbeddingUpdate(status, error) }
    ),
  ]);
};

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

    await indexVideoEmbeddings(payload, {
      waitForReady: true,
      maxAttempts: 10,
      delayMs: 5000,
    });

    logMetric('video.embedding_job.completed', {
      ...baseMeta,
      chunkCount: chunks.length,
      durationMs: getDurationMs(embeddingStartedAt),
      status: 'success',
    });

    await setVideoAndChunksEmbeddingStatus(video._id, 'completed');

    logMetric('video.post_chunk_jobs.completed', {
      ...baseMeta,
      chunkCount: chunks.length,
      durationMs: getDurationMs(startedAt),
      summaryStatus: 'completed',
      embeddingStatus: 'completed',
      status: 'success',
    });
  } catch (error) {
    await setVideoAndChunksEmbeddingStatus(
      video._id,
      'failed',
      error.message || 'Background processing failed'
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
  setVideoEmbeddingStatus,
  setVideoAndChunksEmbeddingStatus,
};
