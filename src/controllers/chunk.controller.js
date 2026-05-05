const mongoose = require('mongoose');
const Video = require('../models/video.model');
const TranscriptChunk = require('../models/transcriptChunk.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { chunkTranscriptText } = require('../services/chunk.service');
const { logInfo } = require('../utils/logger');

const getOwnedVideo = async (videoIdParam, userId) => {
  if (!mongoose.Types.ObjectId.isValid(videoIdParam)) {
    throw new ApiError(400, 'Invalid video id');
  }

  const video = await Video.findOne({ _id: videoIdParam, user: userId });
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  return video;
};

const createVideoChunks = asyncHandler(async (req, res) => {
  const video = await getOwnedVideo(req.params.id, req.user._id);

  const existingCount = await TranscriptChunk.countDocuments({ video: video._id });
  if (existingCount > 0) {
    throw new ApiError(409, 'Chunks already exist for this video');
  }

  if (!video.transcriptText || !video.transcriptText.trim()) {
    throw new ApiError(422, 'Transcript text is empty. Process transcript first.');
  }

  const chunks = chunkTranscriptText(video.transcriptText);
  if (!chunks.length) {
    throw new ApiError(422, 'Unable to create chunks from transcript');
  }

  const docs = chunks.map((chunk) => ({
    user: req.user._id,
    video: video._id,
    videoId: video.videoId,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    tokenEstimate: chunk.tokenEstimate,
    embeddingStatus: 'pending',
    embeddingError: null,
  }));

  await TranscriptChunk.insertMany(docs);

  logInfo('video.chunks.created', {
    userId: req.user._id.toString(),
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    chunkCount: chunks.length,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, 'Transcript chunks created successfully', { chunkCount: docs.length })
    );
});

const getVideoChunks = asyncHandler(async (req, res) => {
  const video = await getOwnedVideo(req.params.id, req.user._id);

  const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Transcript chunks fetched successfully', { chunks }));
});

module.exports = {
  createVideoChunks,
  getVideoChunks,
};
