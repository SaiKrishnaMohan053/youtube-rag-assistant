const TranscriptChunk = require('../models/transcriptChunk.model');
const ApiError = require('../utils/apiError');
const { indexVideoEmbeddings, searchVideoEmbeddings } = require('./embeddingClient.service');
const { logInfo, logError, getDurationMs } = require('../utils/logger');
const { expandQueryTerms } = require('./queryExpansion.service');
const { searchEntityAwareChunks } = require('./entityRetrieval.service');
const { searchTopicAwareChunks } = require('./topicRetrieval.service');

const isMissingFaissIndexError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  return (
    message.includes('index for videoid not found') ||
    message.includes('index for videoid') ||
    message.includes('not found')
  );
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeKeywordTerms = (terms = []) => {
  const normalized = [];

  terms.forEach((term) => {
    const clean = String(term || '').trim();
    if (!clean) return;

    normalized.push(clean);

    clean
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
      .forEach((part) => normalized.push(part));
  });

  return [...new Set(normalized)].slice(0, 30);
};

const calculateKeywordScore = (text = '', terms = []) => {
  const cleanText = String(text).toLowerCase();

  if (!terms.length || !cleanText) return 0;

  const matchedTerms = terms.filter((term) => cleanText.includes(String(term).toLocaleLowerCase()));
  return matchedTerms.length / terms.length;
};

const calculateFinalRetrievalScore = (chunk = {}, terms = []) => {
  const text = String(chunk.text || '').toLowerCase();

  const termHits = terms.filter((term) => text.includes(String(term).toLowerCase())).length;

  const lexicalScore = terms.length ? termHits / terms.length : 0;
  const vectorScore = typeof chunk.score === 'number' ? chunk.score : 0;
  const keywordScore = typeof chunk.keywordScore === 'number' ? chunk.keywordScore : 0;

  const sourceBoost =
    chunk.retrievalSource === 'entity' || chunk.retrievalSource === 'entity_hybrid'
      ? 0.45
      : chunk.retrievalSource === 'topic' || chunk.retrievalSource === 'topic_hybrid'
        ? 0.35
        : chunk.retrievalSource === 'hybrid'
          ? 0.2
          : chunk.retrievalSource === 'keyword'
            ? 0.12
            : 0;

  return Math.max(vectorScore, keywordScore) + lexicalScore + sourceBoost;
};

const searchTranscriptChunksByKeyword = async ({ video, query, limit = 6, terms = [] }) => {
  const startedAt = Date.now();
  const keywordTerms = Array.isArray(terms) && terms.length ? normalizeKeywordTerms(terms) : [];

  if (!keywordTerms.length) {
    return [];
  }

  const regexConditions = keywordTerms.map((term) => ({
    text: { $regex: escapeRegex(term), $options: 'i' },
  }));

  const chunks = await TranscriptChunk.find({
    video: video._id,
    $or: regexConditions,
  })
    .sort({ chunkIndex: 1 })
    .limit(limit * 2)
    .lean();

  const keywordMatches = chunks
    .map((chunk) => ({
      ...chunk,
      score: calculateKeywordScore(chunk.text, keywordTerms),
      retrievalSource: 'keyword',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  logInfo('rag.keyword_search.completed', {
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    queryTerms: keywordTerms,
    matchCount: keywordMatches.length,
    durationMs: getDurationMs(startedAt),
  });

  return keywordMatches;
};

const isGroundedRetrievalSource = (source = '') =>
  ['keyword', 'hybrid', 'entity', 'entity_hybrid', 'topic', 'topic_hybrid'].includes(source);

const cleanupMergedMatches = ({ chunks = [], topK = 4 }) => {
  const groundedChunks = chunks.filter((chunk) => isGroundedRetrievalSource(chunk.retrievalSource));

  const vectorChunks = chunks.filter((chunk) => chunk.retrievalSource === 'vector');

  if (groundedChunks.length >= topK) {
    return groundedChunks.slice(0, topK);
  }

  if (groundedChunks.length > 0) {
    return [...groundedChunks, ...vectorChunks.slice(0, topK - groundedChunks.length)];
  }

  return chunks.slice(0, topK);
};

const mergeRetrievalMatches = ({
  vectorMatches = [],
  keywordMatches = [],
  entityMatches = [],
  topicMatches = [],
  topK = 6,
  terms = [],
}) => {
  const merged = new Map();

  topicMatches.forEach((chunk, index) => {
    const key = String(chunk.chunkIndex ?? chunk.chunkId ?? chunk._id ?? index);

    merged.set(key, {
      ...chunk,
      retrievalSource: 'topic',
      topicRank: index + 1,
      vectorRank: null,
      keywordRank: null,
    });
  });

  entityMatches.forEach((chunk, index) => {
    const key = String(chunk.chunkIndex ?? chunk.chunkId ?? chunk._id ?? index);

    merged.set(key, {
      ...chunk,
      retrievalSource: 'entity',
      entityRank: index + 1,
      vectorRank: null,
      keywordRank: null,
    });
  });

  vectorMatches.forEach((chunk, index) => {
    const key = String(chunk.chunkIndex ?? chunk.chunkId ?? chunk._id ?? index);

    if (merged.has(key)) {
      const existing = merged.get(key);

      merged.set(key, {
        ...existing,
        retrievalSource:
          existing.retrievalSource === 'entity'
            ? 'entity_hybrid'
            : existing.retrievalSource === 'topic'
              ? 'topic_hybrid'
              : 'hybrid',
        vectorRank: index + 1,
        score: Math.max(existing.score ?? 0, chunk.score ?? 0),
      });
    } else {
      merged.set(key, {
        ...chunk,
        retrievalSource: 'vector',
        vectorRank: index + 1,
        keywordRank: null,
      });
    }
  });

  keywordMatches.forEach((chunk, index) => {
    const key = String(chunk.chunkIndex ?? chunk.chunkId ?? chunk._id ?? index);

    if (merged.has(key)) {
      const existing = merged.get(key);

      merged.set(key, {
        ...existing,
        keywordRank: index + 1,
        retrievalSource:
          existing.retrievalSource === 'entity' || existing.retrievalSource === 'entity_hybrid'
            ? 'entity_hybrid'
            : existing.retrievalSource === 'topic' || existing.retrievalSource === 'topic_hybrid'
              ? 'topic_hybrid'
              : 'hybrid',
        keywordScore: chunk.score,
        score: Math.max(existing.score ?? 0, chunk.score ?? 0),
      });
    } else {
      merged.set(key, {
        ...chunk,
        retrievalSource: 'keyword',
        vectorRank: null,
        keywordRank: index + 1,
        keywordScore: chunk.score,
        score: chunk.score,
      });
    }
  });

  const rankedChunks = Array.from(merged.values())
    .map((chunk) => ({
      ...chunk,
      finalRetrievalScore: calculateFinalRetrievalScore(chunk, terms),
    }))
    .sort((a, b) => b.finalRetrievalScore - a.finalRetrievalScore);

  return cleanupMergedMatches({
    chunks: rankedChunks,
    topK,
  });
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

const searchVectorWithAutoReindex = async ({ video, query, topK }) => {
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

const searchVideoEmbeddingsWithAutoReindex = async ({ video, query, topK }) => {
  const startedAt = Date.now();

  const [expandedTerms, entityMatches, topicMatches] = await Promise.all([
    expandQueryTerms({ video, query }),
    searchEntityAwareChunks({ video, query, limit: topK }),
    searchTopicAwareChunks({ video, query, limit: topK }),
  ]);

  const [vectorResponse, keywordMatches] = await Promise.all([
    searchVectorWithAutoReindex({ video, query, topK }),
    searchTranscriptChunksByKeyword({
      video,
      query,
      limit: topK,
      terms: expandedTerms,
    }),
  ]);

  const vectorMatches = Array.isArray(vectorResponse.matches) ? vectorResponse.matches : [];

  const matches = mergeRetrievalMatches({
    vectorMatches,
    keywordMatches,
    entityMatches,
    topicMatches,
    topK,
    terms: expandedTerms,
  });

  logInfo('rag.hybrid_search.completed', {
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    vectorMatchCount: vectorMatches.length,
    keywordMatchCount: keywordMatches.length,
    entityMatchCount: entityMatches.length,
    topicMatchCount: topicMatches.length,
    mergedMatchCount: matches.length,
    topK,
    expandedTermCount: expandedTerms.length,
    durationMs: getDurationMs(startedAt),
  });

  return {
    ...vectorResponse,
    matches,
    retrievalMode: 'hybrid',
  };
};

module.exports = {
  searchVideoEmbeddingsWithAutoReindex,
  reindexVideoFromMongoChunks,
  searchTranscriptChunksByKeyword,

  __testables: {
    normalizeKeywordTerms,
    calculateKeywordScore,
    calculateFinalRetrievalScore,
    cleanupMergedMatches,
    mergeRetrievalMatches,
    isMissingFaissIndexError,
  },
};
