const mongoose = require('mongoose');
const Video = require('../models/video.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { searchVideoEmbeddingsWithAutoReindex } = require('../services/ragRetrieval.service');
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

const MIN_RAG_SCORE = 0.18;

const getMatchScore = (chunk = {}) => {
  const score = chunk.score ?? chunk.similarity ?? chunk.distanceScore ?? chunk.relevanceScore;
  return typeof score === 'number' ? score : null;
};

const formatTimestamp = (seconds) => {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
    return 'unknown';
  }

  const total = Math.floor(Number(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const normalizeSupportingChunks = (chunks = []) =>
  chunks.map((chunk, index) => ({
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    startTime: chunk.startTime ?? null,
    endTime: chunk.endTime ?? null,
    timestamp:
      chunk.startTime !== null && chunk.startTime !== undefined
        ? formatTimestamp(chunk.startTime)
        : null,
    score: getMatchScore(chunk),
    keywordScore: chunk.keywordScore ?? null,
    finalRetrievalScore: chunk.finalRetrievalScore ?? null,
    retrievalSource: chunk.retrievalSource ?? null,
    vectorRank: chunk.vectorRank ?? null,
    keywordRank: chunk.keywordRank ?? null,
    entityScore: chunk.entityScore ?? null,
    entityRank: chunk.entityRank ?? null,
    entityTerms: chunk.entityTerms ?? [],
    topicScore: chunk.topicScore ?? null,
    topicRank: chunk.topicRank ?? null,
    topic: chunk.topic ?? null,
    topicTerms: chunk.topicTerms ?? [],
    sourceNumber: index + 1,
  }));

const findOwnedVideo = async (videoIdParam, user) => {
  if (!mongoose.Types.ObjectId.isValid(videoIdParam)) {
    throw new ApiError(400, 'Invalid video id');
  }

  const query =
    user.role === 'admin' ? { _id: videoIdParam } : { _id: videoIdParam, user: user._id };

  const video = await Video.findOne(query);

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  return video;
};

const buildSearchChunks = async ({ video, query, topK }) => {
  const searchResponse = await searchVideoEmbeddingsWithAutoReindex({
    video,
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
      const start = formatTimestamp(chunk.startTime);
      const end = formatTimestamp(chunk.endTime);

      return `[${idx + 1}] ${start} - ${end}
${truncate(chunk.text)}`;
    })
    .join('\n\n');

  return `
You are answering questions about a YouTube video transcript.

Rules:
- Use ONLY the transcript context below.
- Prefer higher-ranked sources. Do not use low-ranked sources if they are unrelated to the question.
- Do not use outside knowledge.
- Ignore promotional content, subscribe/follow requests, social media mentions, and outro.
- If the context does not clearly support the answer, say exactly:
"I don't know based on this video transcript."
- Cite the source numbers inline like [1], [2].
- Be direct and specific.

Transcript context:
${context}

Question:
${query}

Answer in 3-5 sentences:
`.trim();
};

const answerFromFaissChunks = async ({ video, query, topK }) => {
  const rawChunks = await buildSearchChunks({
    video,
    query,
    topK,
  });

  if (!rawChunks.length) {
    return {
      answer: "I don't know based on this video transcript.",
      supportingChunks: [],
    };
  }

  const scoredChunks = rawChunks.filter((chunk) => {
    if (chunk.retrievalSource === 'keyword' || chunk.retrievalSource === 'hybrid') {
      return true;
    }

    const score = getMatchScore(chunk);

    if (score === null) return true;

    return score >= MIN_RAG_SCORE;
  });

  if (!scoredChunks.length) {
    return {
      answer: "I don't know based on this video transcript.",
      supportingChunks: normalizeSupportingChunks(rawChunks.slice(0, 2)),
    };
  }

  const supportingChunks = normalizeSupportingChunks(scoredChunks);

  const prompt = buildPrompt({
    query,
    chunks: supportingChunks,
  });

  const answer = await generateAnswer(prompt, {
    source: 'auth_rag',
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    mode: 'qa',
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
    mode: 'timestamp_query',
  });

  return {
    answer,
    supportingChunks: normalizeSupportingChunks(supportingChunks),
  };
};

const askVideo = asyncHandler(async (req, res) => {
  const startedAt = Date.now();

  const video = await findOwnedVideo(req.params.id, req.user);

  const { query, topK = 4 } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ApiError(400, 'Query is required');
  }

  const cleanQuery = query.trim();
  const route = routeQuestion(cleanQuery);

  const normalizedTopK = Math.min(6, Math.max(3, Number.parseInt(topK, 10) || 4));

  let answer = '';
  let supportingChunks = [];
  let mode = 'specific_qa';
  let actionType = null;
  let retrievalScores = [];
  let avgRetrievalScore = null;

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

  retrievalScores = supportingChunks
    .map((chunk) => chunk.score)
    .filter((score) => typeof score === 'number');

  avgRetrievalScore =
    retrievalScores.length > 0
      ? retrievalScores.reduce((sum, score) => sum + score, 0) / retrievalScores.length
      : null;

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
    avgRetrievalScore,
    maxRetrievalScore: retrievalScores.length > 0 ? Math.max(...retrievalScores) : null,
    minRetrievalScore: retrievalScores.length > 0 ? Math.min(...retrievalScores) : null,
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
  const video = await findOwnedVideo(req.params.id, req.user);

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
