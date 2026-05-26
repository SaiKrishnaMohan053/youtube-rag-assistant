const mongoose = require('mongoose');
const Video = require('../models/video.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { searchVideoEmbeddings } = require('../services/embeddingClient.service');
const { generateAnswer } = require('../services/llm.service');
const ChatMessage = require('../models/chatMessage.model');
const { logInfo } = require('../utils/logger');
const env = require('../config/env');
const { routeQuestion, QUESTION_INTENTS } = require('../utils/questionRouter');
const { buildTimestampPrompt } = require('../services/timestamp.service');
const { answerFromActionRequest } = require('../services/action.service');

const {
  answerFromVideoSummary,
  answerFromEntitySummary,
  answerFromTopicSummary,
} = require('../services/summary.service');

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

const isPromoChunk = (text = '') => {
  const cleanText = String(text).toLowerCase();
  return PROMO_PATTERNS.some((pattern) => pattern.test(cleanText));
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

const buildSearchChunks = async ({ video, query, topK }) => {
  const searchResponse = await searchVideoEmbeddings({
    videoId: video._id.toString(),
    query,
    topK,
  });

  const matches = Array.isArray(searchResponse.matches) ? searchResponse.matches : [];

  const filteredMatches = matches.filter((chunk) => !isPromoChunk(chunk.text));

  return filteredMatches.length ? filteredMatches : matches;
};

const buildPrompt = ({ query, chunks }) => {
  const context = chunks
    .map((chunk, idx) => {
      const time =
        chunk.startTime !== null && chunk.startTime !== undefined
          ? ` timestamp=${chunk.startTime}s`
          : '';

      return `[${idx + 1}${time}] ${truncate(chunk.text)}`;
    })
    .join('\n\n');

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

const answerFromFaissChunks = async ({ video, query, topK }) => {
  const supportingChunks = await buildSearchChunks({
    video,
    query,
    topK,
  });

  if (!supportingChunks.length) {
    throw new ApiError(404, 'No relevant transcript chunks found');
  }

  const prompt = buildPrompt({
    query,
    chunks: supportingChunks,
  });

  const answer = await generateAnswer(prompt, {
    source: 'auth_rag',
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    mode: 'qa'
  });

  return {
    answer,
    supportingChunks,
  };
};

const answerFromTimestampChunks = async ({ video, query, topK }) => {
  const supportingChunks = await buildSearchChunks({
    video,
    query,
    topK,
  });

  if (!supportingChunks.length) {
    throw new ApiError(404, 'No relevant timestamp chunks found');
  }

  const prompt = buildTimestampPrompt({
    query,
    chunks: supportingChunks,
  });

  const answer = await generateAnswer(prompt, {
    source: 'auth_rag',
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    mode: 'timestamp_query'
  });

  return {
    answer,
    supportingChunks,
  };
};

const askVideo = asyncHandler(async (req, res) => {
  const startedAt = Date.now();

  const video = await findOwnedVideo(req.params.id, req.user._id);

  const { query, topK = 6 } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ApiError(400, 'Query is required');
  }

  const cleanQuery = query.trim();
  const route = routeQuestion(cleanQuery);

  const normalizedTopK = Math.min(8, Math.max(3, Number.parseInt(topK, 10) || 6));

  let answer = '';
  let supportingChunks = [];
  let mode = 'specific_qa';
  let actionType = null;

  if (route.intent === QUESTION_INTENTS.VIDEO_OVERVIEW) {
    mode = 'summary';

    answer = await answerFromVideoSummary({
      video,
      query: cleanQuery,
    });
  } else if (route.intent === QUESTION_INTENTS.ENTITY_OVERVIEW) {
    mode = 'entity_overview';

    answer = await answerFromEntitySummary({
      video,
      query: cleanQuery,
      entity: route.entity,
    });
  } else if (route.intent === QUESTION_INTENTS.TOPIC_OVERVIEW) {
    mode = 'topic_overview';

    answer = await answerFromTopicSummary({
      video,
      query: cleanQuery,
      topic: route.topic,
    });
  } else if (route.intent === QUESTION_INTENTS.TIMESTAMP_QUERY) {
    mode = 'timestamp_query';

    const result = await answerFromTimestampChunks({
      video,
      query: cleanQuery,
      topK: normalizedTopK,
    });

    answer = result.answer;
    supportingChunks = result.supportingChunks;
  } else if (route.intent === QUESTION_INTENTS.ACTION_EXTRACTION) {
    mode = 'action_extraction';

    const result = await answerFromActionRequest({
      video,
      query: cleanQuery,
    });

    answer = result.answer;
    supportingChunks = result.supportingChunks;
    actionType = result.actionType;
  } else {
    mode = 'qa';

    const result = await answerFromFaissChunks({
      video,
      query: cleanQuery,
      topK: normalizedTopK,
    });

    answer = result.answer;
    supportingChunks = result.supportingChunks;
  }

  const chatMessage = await ChatMessage.create({
    user: req.user._id,
    video: video._id,
    videoId: video.videoId,
    question: cleanQuery,
    answer,
    supportingChunks,
  });

  logInfo('video.ask.completed', {
    userId: req.user._id.toString(),
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    mode,
    intent: route.intent,
    actionType,
    entity: route.entity || null,
    topic: route.topic || null,
    topK: normalizedTopK,
    supportingChunkCount: supportingChunks.length,
    llmProvider: env.llmProvider,
    llmModel: env.llmProvider === 'openai' ? env.openaiModel : env.ollamaModel,
    durationMs: Date.now() - startedAt,
  });

  return res.status(200).json(
    new ApiResponse(200, 'Answer generated successfully', {
      chatMessageId: chatMessage._id,
      answer,
      supportingChunks,
      mode,
      intent: route.intent,
      entity: route.entity || null,
      topic: route.topic || null,
      actionType,
    })
  );
});

const getVideoChats = asyncHandler(async (req, res) => {
  const video = await findOwnedVideo(req.params.id, req.user._id);

  const chats = await ChatMessage.find({
    user: req.user._id,
    video: video._id,
  }).sort({
    createdAt: 1,
  });

  return res.status(200).json(new ApiResponse(200, 'Chat history fetched successfully', { chats }));
});

module.exports = {
  askVideo,
  getVideoChats,
};
