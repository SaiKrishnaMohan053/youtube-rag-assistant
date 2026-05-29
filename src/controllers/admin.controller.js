const mongoose = require('mongoose');
const User = require('../models/user.model');
const Video = require('../models/video.model');
const TranscriptChunk = require('../models/transcriptChunk.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getEmbeddingCounts = async (match = {}) => {
  const counts = await TranscriptChunk.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$embeddingStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  return counts.reduce(
    (acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    },
    { pending: 0, completed: 0, failed: 0 }
  );
};

const getAdminOverview = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    adminUsers,
    regularUsers,
    totalVideos,
    totalChunks,
    completedSummaries,
    failedSummaries,
    pendingSummaries,
    embeddingCounts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'user' }),
    Video.countDocuments(),
    TranscriptChunk.countDocuments(),
    Video.countDocuments({ summaryStatus: 'completed' }),
    Video.countDocuments({ summaryStatus: 'failed' }),
    Video.countDocuments({ summaryStatus: 'pending' }),
    getEmbeddingCounts(),
  ]);

  return res.status(200).json(
    new ApiResponse(200, 'Admin overview fetched successfully', {
      totalUsers,
      adminUsers,
      regularUsers,
      totalVideos,
      totalChunks,
      summaries: {
        completed: completedSummaries,
        failed: failedSummaries,
        pending: pendingSummaries,
      },
      embeddings: embeddingCounts,
    })
  );
});

const getAdminUsers = asyncHandler(async (_req, res) => {
  const users = await User.aggregate([
    {
      $lookup: {
        from: 'videos',
        localField: '_id',
        foreignField: 'user',
        as: 'videos',
      },
    },
    {
      $lookup: {
        from: 'transcriptchunks',
        localField: '_id',
        foreignField: 'user',
        as: 'chunks',
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        authProvider: 1,
        isEmailVerified: 1,
        createdAt: 1,
        updatedAt: 1,
        videoCount: { $size: '$videos' },
        chunkCount: { $size: '$chunks' },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, 'Admin users fetched successfully', { users }));
});

const getAdminUserVideos = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user id');
  }

  const user = await User.findById(userId).select(
    'name email role authProvider isEmailVerified createdAt'
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const videos = await Video.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'transcriptchunks',
        localField: '_id',
        foreignField: 'video',
        as: 'chunks',
      },
    },
    {
      $project: {
        videoId: 1,
        url: 1,
        title: 1,
        transcriptStatus: 1,
        transcriptError: 1,
        summaryStatus: 1,
        summaryError: 1,
        summaryGeneratedAt: '$summary.generatedAt',
        hasShortSummary: {
          $gt: [{ $strLenCP: { $ifNull: ['$summary.shortSummary', ''] } }, 0],
        },
        hasDetailedSummary: {
          $gt: [{ $strLenCP: { $ifNull: ['$summary.detailedSummary', ''] } }, 0],
        },
        duration: 1,
        createdAt: 1,
        updatedAt: 1,
        chunkCount: { $size: '$chunks' },
        embeddingCompleted: {
          $size: {
            $filter: {
              input: '$chunks',
              as: 'chunk',
              cond: { $eq: ['$$chunk.embeddingStatus', 'completed'] },
            },
          },
        },
        embeddingFailed: {
          $size: {
            $filter: {
              input: '$chunks',
              as: 'chunk',
              cond: { $eq: ['$$chunk.embeddingStatus', 'failed'] },
            },
          },
        },
        embeddingPending: {
          $size: {
            $filter: {
              input: '$chunks',
              as: 'chunk',
              cond: { $eq: ['$$chunk.embeddingStatus', 'pending'] },
            },
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, 'Admin user videos fetched successfully', {
      user,
      videos,
    })
  );
});

const getAdminVideoChunks = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, 'Invalid video id');
  }

  const video = await Video.findById(videoId).populate('user', 'name email role');

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  const chunks = await TranscriptChunk.find({ video: video._id })
    .sort({ chunkIndex: 1 })
    .select(
      'chunkIndex text startTime endTime tokenEstimate embeddingStatus embeddingError createdAt updatedAt'
    )
    .lean();

  const embeddingCounts = chunks.reduce(
    (acc, chunk) => {
      acc[chunk.embeddingStatus || 'unknown'] = (acc[chunk.embeddingStatus || 'unknown'] || 0) + 1;
      return acc;
    },
    { pending: 0, completed: 0, failed: 0 }
  );

  return res.status(200).json(
    new ApiResponse(200, 'Admin video chunks fetched successfully', {
      video: {
        _id: video._id,
        user: video.user,
        videoId: video.videoId,
        url: video.url,
        title: video.title,
        transcriptStatus: video.transcriptStatus,
        transcriptError: video.transcriptError,
        summaryStatus: video.summaryStatus,
        summaryError: video.summaryError,
        summaryGeneratedAt: video.summary?.generatedAt,
        hasShortSummary: Boolean(video.summary?.shortSummary),
        hasDetailedSummary: Boolean(video.summary?.detailedSummary),
        duration: video.duration,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
      },
      chunkCount: chunks.length,
      embeddingCounts,
      chunks,
    })
  );
});

module.exports = {
  getAdminOverview,
  getAdminUsers,
  getAdminUserVideos,
  getAdminVideoChunks,
};
