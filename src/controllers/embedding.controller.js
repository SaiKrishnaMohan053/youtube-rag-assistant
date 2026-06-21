const mongoose = require('mongoose');
const Video = require('../models/video.model');
const TranscriptChunk = require('../models/transcriptChunk.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const {
  getEmbeddingHealth,
  indexVideoEmbeddings,
  searchVideoEmbeddings,
  getVideoIndexStatus,
} = require('../services/embeddingClient.service');
const { logInfo, logError } = require('../utils/logger');
const {
  setVideoEmbeddingStatus,
  setVideoAndChunksEmbeddingStatus,
} = require('../services/videoProcessingJob.service');

const findOwnedVideo = async (videoIdParam, userId) => {
  if (!mongoose.Types.ObjectId.isValid(videoIdParam)) {
    throw new ApiError(400, 'Invalid video id');
  }

  const video = await Video.findOne({ _id: videoIdParam, user: userId });
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  return video;
};

const findAnyVideoById = async (videoIdParam) => {
  if (!mongoose.Types.ObjectId.isValid(videoIdParam)) {
    throw new ApiError(400, 'Invalid video id');
  }

  const video = await Video.findById(videoIdParam);

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  return video;
};

const embeddingHealth = asyncHandler(async (_req, res) => {
  const health = await getEmbeddingHealth();
  return res.status(200).json(new ApiResponse(200, 'Embedding service health fetched', { health }));
});

const getOwnedVideoIndexStatus = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const indexStatus = await getVideoIndexStatus(video._id.toString());

  return res.status(200).json(
    new ApiResponse(200, 'Video index status fetched successfully', {
      videoId: video._id,
      indexStatus,
    })
  );
});

const indexVideo = asyncHandler(async (req, res) => {
  const startedAt = Date.now();

  const video = await findOwnedVideo(req.params.id, req.user._id);

  const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 });
  if (!chunks.length) {
    throw new ApiError(400, 'No transcript chunks found. Please create chunks before indexing.');
  }

  const payload = {
    videoId: video._id.toString(),
    chunks: chunks.map((chunk) => ({
      chunkId: chunk._id.toString(),
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
    })),
  };

  try {
    await setVideoEmbeddingStatus(video._id, 'processing');

    const serviceResponse = await indexVideoEmbeddings(payload);

    await setVideoAndChunksEmbeddingStatus(video._id, 'completed');

    logInfo('video.index.completed', {
      userId: req.user._id.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      chunkCount: chunks.length,
      durationMs: Date.now() - startedAt,
    });

    return res.status(200).json(
      new ApiResponse(200, 'Video chunks indexed successfully', {
        indexedCount: payload.chunks.length,
        service: serviceResponse,
      })
    );
  } catch (error) {
    await setVideoAndChunksEmbeddingStatus(video._id, 'failed', error.message);

    logError('video.index.failed', {
      userId: req.user._id.toString(),
      videoMongoId: video?._id?.toString(),
      durationMs: Date.now() - startedAt,
      error: error.message,
    });

    throw error;
  }
});

const adminIndexVideo = asyncHandler(async (req, res) => {
  const startedAt = Date.now();

  const video = await findAnyVideoById(req.params.videoId);

  const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 });

  if (!chunks.length) {
    throw new ApiError(400, 'No transcript chunks found. Please create chunks before indexing.');
  }

  const payload = {
    videoId: video._id.toString(),
    chunks: chunks.map((chunk) => ({
      chunkId: chunk._id.toString(),
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
    })),
  };

  try {
    await setVideoEmbeddingStatus(video._id, 'processing');
    const serviceResponse = await indexVideoEmbeddings(payload);

    await setVideoAndChunksEmbeddingStatus(video._id, 'completed');

    logInfo('admin.video.index.completed', {
      adminId: req.user._id.toString(),
      ownerId: video.user?.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      chunkCount: chunks.length,
      durationMs: Date.now() - startedAt,
    });

    return res.status(200).json(
      new ApiResponse(200, 'Admin video re-index completed successfully', {
        indexedCount: payload.chunks.length,
        service: serviceResponse,
      })
    );
  } catch (error) {
    await setVideoAndChunksEmbeddingStatus(video._id, 'failed', error.message);

    logError('admin.video.index.failed', {
      adminId: req.user._id.toString(),
      ownerId: video.user?.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });

    throw error;
  }
});

const searchVideo = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const { query, topK = 3 } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ApiError(400, 'Query is required');
  }

  const normalizedTopK = Math.min(5, Math.max(1, Number.parseInt(topK, 10) || 3));

  const serviceResponse = await searchVideoEmbeddings({
    videoId: video._id.toString(),
    query: query.trim(),
    topK: normalizedTopK,
  });

  return res.status(200).json(
    new ApiResponse(200, 'Retrieved relevant chunks successfully', {
      matches: serviceResponse.matches || [],
    })
  );
});

module.exports = {
  embeddingHealth,
  indexVideo,
  searchVideo,
  adminIndexVideo,
  getOwnedVideoIndexStatus,
};
