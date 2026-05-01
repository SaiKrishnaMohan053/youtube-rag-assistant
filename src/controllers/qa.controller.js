const mongoose = require('mongoose');
const Video = require('../models/video.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { searchVideoEmbeddings } = require('../services/embeddingClient.service');
const { generateAnswer } = require('../services/llm.service');
const ChatMessage = require('../models/chatMessage.model');

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

const askVideo = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);
  const { query, topK = 5 } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ApiError(400, 'Query is required');
  }

  const searchResponse = await searchVideoEmbeddings({
    videoId: video.videoId,
    query: query.trim(),
    topK,
  });

  const supportingChunks = Array.isArray(searchResponse.matches) ? searchResponse.matches : [];
  const context = supportingChunks.map((chunk, idx) => `[${idx + 1}] ${chunk.text || ''}`).join('\n\n');

  const prompt = `You are a helpful assistant.
Answer ONLY using the provided video transcript context.
If the answer is not clearly supported by the context, say:
"I don't know based on this video."

Context:
${context}

Question:
${query.trim()}

Answer:`;

  const answer = await generateAnswer(prompt);

  const chatMessage = await ChatMessage.create({
    user: req.user._id,
    video: video._id,
    videoId: video.videoId,
    question: query.trim(),
    answer,
    supportingChunks,
  });

  return res.status(200).json(
    new ApiResponse(200, 'Answer generated successfully', {
      chatMessageId: chatMessage._id,
      answer,
      supportingChunks,
    })
  );
});

const getVideoChats = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const chats = await ChatMessage.find({ user: req.user._id, video: video._id }).sort({ createdAt: 1 });

  return res.status(200).json(new ApiResponse(200, 'Chat history fetched successfully', { chats }));
});

module.exports = {
  askVideo,
  getVideoChats,
};
