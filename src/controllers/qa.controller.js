const mongoose = require('mongoose');
const Video = require('../models/video.model');
const TranscriptChunk = require('../models/transcriptChunk.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { searchVideoEmbeddings } = require('../services/embeddingClient.service');
const { generateAnswer } = require('../services/llm.service');
const ChatMessage = require('../models/chatMessage.model');

const PROMO_PATTERNS = [
  /subscribe/i,
  /follow/i,
  /instagram/i,
  /youtube channel/i,
  /like and share/i,
  /comment below/i,
  /link in bio/i,
  /check out/i,
];

const SUMMARY_QUERY_PATTERNS = [
  /what is this video/i,
  /what is this video about/i,
  /main points/i,
  /summarize/i,
  /summary/i,
  /key points/i,
  /overview/i,
  /explain this video/i,
];

const isPromoChunk = (text = '') => {
  const cleanText = String(text).toLowerCase();
  return PROMO_PATTERNS.some((pattern) => pattern.test(cleanText));
};

const isSummaryQuery = (query = '') => {
  return SUMMARY_QUERY_PATTERNS.some((pattern) => pattern.test(query));
};

const truncate = (text = '', max = 900) => {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
};

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

const buildSummaryChunks = async (video) => {
  const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 }).lean();

  if (!chunks.length) {
    throw new ApiError(400, 'No transcript chunks found for this video');
  }

  const cleanChunks = chunks.filter((chunk) => !isPromoChunk(chunk.text));

  const sourceChunks = cleanChunks.length ? cleanChunks : chunks;

  const total = sourceChunks.length;

  const selectedIndexes = new Set();

  // Start section
  for (let i = 0; i < Math.min(3, total); i += 1) {
    selectedIndexes.add(i);
  }

  // Middle section
  const middle = Math.floor(total / 2);
  for (let i = Math.max(0, middle - 2); i <= Math.min(total - 1, middle + 2); i += 1) {
    selectedIndexes.add(i);
  }

  // Late-middle section, but avoid final outro area
  const lateMiddle = Math.floor(total * 0.75);
  for (let i = Math.max(0, lateMiddle - 1); i <= Math.min(total - 1, lateMiddle + 1); i += 1) {
    selectedIndexes.add(i);
  }

  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => sourceChunks[index])
    .filter(Boolean);
};

const buildSearchChunks = async ({ video, query, topK }) => {
  const searchResponse = await searchVideoEmbeddings({
    videoId: video.videoId,
    query,
    topK,
  });

  const matches = Array.isArray(searchResponse.matches) ? searchResponse.matches : [];

  const filteredMatches = matches.filter((chunk) => !isPromoChunk(chunk.text));

  return filteredMatches.length ? filteredMatches : matches;
};

const buildPrompt = ({ query, chunks, mode }) => {
  const context = chunks
    .map((chunk, idx) => {
      const time =
        chunk.startTime !== null && chunk.startTime !== undefined
          ? ` timestamp=${chunk.startTime}s`
          : '';

      return `[${idx + 1}${time}] ${truncate(chunk.text)}`;
    })
    .join('\n\n');

  if (mode === 'summary') {
    return `
You are summarizing a YouTube video using transcript context.

Rules:
- Focus on the main topic and important discussion.
- Ignore promotional content, social media mentions, subscribe/follow requests, and outro.
- Do not make Instagram/YouTube promotion a main point unless the whole video is actually about that.
- If the transcript context is incomplete, say that the summary is based on available transcript parts.
- Keep the answer useful for someone who does not want to watch the full video.

Transcript context:
${context}

Question:
${query}

Answer format:
1. What the video is about: 2-3 sentences
2. Main points: 4-6 bullet points
`.trim();
  }

  return `
Use only the transcript context to answer the user's question.

Rules:
- Answer the actual question.
- Ignore promotional content, social media mentions, subscribe/follow requests, and outro.
- If the answer is not supported by the transcript context, say: "I don't have enough transcript context to answer that."
- Be direct and specific.

Transcript context:
${context}

Question:
${query}

Answer in 3-5 sentences.
`.trim();
};

const askVideo = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const { query, topK = 6 } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ApiError(400, 'Query is required');
  }

  const cleanQuery = query.trim();
  const summaryMode = isSummaryQuery(cleanQuery);

  const normalizedTopK = Math.min(8, Math.max(3, Number.parseInt(topK, 10) || 6));

  const supportingChunks = summaryMode
    ? await buildSummaryChunks(video)
    : await buildSearchChunks({
        video,
        query: cleanQuery,
        topK: normalizedTopK,
      });

  if (!supportingChunks.length) {
    throw new ApiError(404, 'No relevant transcript chunks found');
  }

  const prompt = buildPrompt({
    query: cleanQuery,
    chunks: supportingChunks,
    mode: summaryMode ? 'summary' : 'qa',
  });

  const answer = await generateAnswer(prompt);

  const chatMessage = await ChatMessage.create({
    user: req.user._id,
    video: video._id,
    videoId: video.videoId,
    question: cleanQuery,
    answer,
    supportingChunks,
  });

  return res.status(200).json(
    new ApiResponse(200, 'Answer generated successfully', {
      chatMessageId: chatMessage._id,
      answer,
      supportingChunks,
      mode: summaryMode ? 'summary' : 'qa',
    })
  );
});

const getVideoChats = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const chats = await ChatMessage.find({ user: req.user._id, video: video._id }).sort({
    createdAt: 1,
  });

  return res.status(200).json(new ApiResponse(200, 'Chat history fetched successfully', { chats }));
});

module.exports = {
  askVideo,
  getVideoChats,
};
