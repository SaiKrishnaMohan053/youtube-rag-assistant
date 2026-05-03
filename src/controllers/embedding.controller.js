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
} = require('../services/embeddingClient.service');

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

const embeddingHealth = asyncHandler(async (_req, res) => {
  const health = await getEmbeddingHealth();
  return res.status(200).json(new ApiResponse(200, 'Embedding service health fetched', { health }));
});

const indexVideo = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 });
  if (!chunks.length) {
    throw new ApiError(400, 'No transcript chunks found. Please create chunks before indexing.');
  }

  const payload = {
    videoId: video.videoId,
    chunks: chunks.map((chunk) => ({
      chunkId: chunk._id.toString(),
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
    })),
  };

  try {
    const serviceResponse = await indexVideoEmbeddings(payload);

    await TranscriptChunk.updateMany(
      { video: video._id },
      {
        $set: {
          embeddingStatus: 'completed',
          embeddingError: null,
        },
      }
    );

    return res.status(200).json(
      new ApiResponse(200, 'Video chunks indexed successfully', {
        indexedCount: payload.chunks.length,
        service: serviceResponse,
      })
    );
  } catch (error) {
    await TranscriptChunk.updateMany(
      { video: video._id },
      {
        $set: {
          embeddingStatus: 'failed',
          embeddingError: error.message,
        },
      }
    );

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
    videoId: video.videoId,
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
};
