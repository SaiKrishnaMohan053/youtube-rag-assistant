const Video = require('../models/video.model');
const TranscriptChunk = require('../models/transcriptChunk.model');
const ChatMessage = require('../models/chatMessage.model');
const asyncHandler = require('../utils/asyncHandler');
const axios = require('axios');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { getYouTubeVideoId } = require('../utils/youtube');
const { fetchTranscriptByVideoId } = require('../services/transcript.service');
const { logInfo, logError } = require('../utils/logger');

const processVideo = asyncHandler(async (req, res) => {
  const startedAt = Date.now();

  const { url, title } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new ApiError(400, 'Video URL is required');
  }

  const normalizedUrl = url.trim();
  const videoId = getYouTubeVideoId(normalizedUrl);

  const existing = await Video.findOne({ user: req.user._id, videoId });
  if (existing) {
    throw new ApiError(409, 'This video has already been processed for your account');
  }

  const video = await Video.create({
    user: req.user._id,
    videoId,
    url: normalizedUrl,
    title: title && typeof title === 'string' ? title.trim() : null,
    transcriptStatus: 'pending',
  });

  try {
    const { transcriptText, duration } = await fetchTranscriptByVideoId(videoId);

    video.transcriptText = transcriptText;
    video.transcriptStatus = 'completed';
    video.transcriptError = null;
    video.duration = duration;
    await video.save();
    logInfo('video.process.completed', {
      userId: req.user._id.toString(),
      videoMongoId: video._id.toString(),
      youtubeVideoId: video.videoId,
      durationMs: Date.now() - startedAt,
      transcriptLength: video.transcriptText.length,
    });
  } catch (error) {
    video.transcriptStatus = 'failed';
    video.transcriptError = error.message;
    await video.save();
    logError('video.process.failed', {
      userId: req.user._id.toString(),
      youtubeVideoId: videoId,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
    throw error;
  }

  return res
    .status(201)
    .json(new ApiResponse(201, 'Video transcript processed successfully', { video }));
});

const getMyVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ user: req.user._id }).sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, 'Videos fetched successfully', { videos }));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const video = await Video.findOne({ _id: id, user: req.user._id });

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  return res.status(200).json(new ApiResponse(200, 'Video fetched successfully', { video }));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const video = await Video.findOne({ _id: id, user: req.user._id });

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  try {
    await axios.delete(`${process.env.EMBEDDING_SERVICE_URL}/videos/${video._id.toString()}/index`);
  } catch (err) {
    console.warn('FAISS delete failed:', err.response?.data || err.message);
  }

  await Promise.all([
    TranscriptChunk.deleteMany({ video: video._id, user: req.user._id }),
    ChatMessage.deleteMany({ video: video._id, user: req.user._id }),
    Video.deleteOne({ _id: video._id, user: req.user._id }),
  ]);

  return res.status(200).json(new ApiResponse(200, 'Video deleted successfully'));
});

module.exports = {
  processVideo,
  getMyVideos,
  getVideoById,
  deleteVideo,
};
