const TranscriptChunk = require('../models/transcriptChunk.model');
const ApiError = require('../utils/apiError');
const { indexVideoEmbeddings, searchVideoEmbeddings } = require('./embeddingClient.service');
const { logInfo, logError, getDurationMs } = require('../utils/logger');

const isMissingFaissIndexError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  return (
    message.includes('index for videoid not found') ||
    message.includes('index for videoid') ||
    message.includes('not found')
  );
};

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

const reindexVideoFromMongoChunks = async ({ video }) => {
  const startedAt = Date.now();

  const chunks = await TranscriptChunk.find({ video: video._id }).sort({
    chunkIndex: 1,
  });

  if (!chunks.length) {
    throw new ApiError(404, 'No transcript chunks found for re-indexing');
  }

  const payload = buildEmbeddingPayload({ video, chunks });

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

  logInfo('rag.auto_reindex.completed', {
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    chunkCount: chunks.length,
    durationMs: getDurationMs(startedAt),
  });

  return chunks.length;
};

const searchVideoEmbeddingsWithAutoReindex = async ({ video, query, topK }) => {
  try {
    return await searchVideoEmbeddings({
      videoId: video._id.toString(),
      query,
      topK,
    });
  } catch (error) {
    if (!isMissingFaissIndexError(error)) {
      throw error;
    }

    logInfo('rag.auto_reindex.started', {
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      reason: error.message,
    });

    try {
      await reindexVideoFromMongoChunks({ video });

      return await searchVideoEmbeddings({
        videoId: video._id.toString(),
        query,
        topK,
      });
    } catch (reindexError) {
      logError('rag.auto_reindex.failed', {
        videoMongoId: video._id.toString(),
        youtubeVideoId: video.videoId,
        originalError: error.message,
        error: reindexError.message,
      });

      throw reindexError;
    }
  }
};

module.exports = {
  searchVideoEmbeddingsWithAutoReindex,
  reindexVideoFromMongoChunks,
};
