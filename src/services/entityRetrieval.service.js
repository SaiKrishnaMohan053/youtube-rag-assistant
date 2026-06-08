const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAnswer } = require('./llm.service');
const { logInfo, logError, getDurationMs } = require('../utils/logger');
const { classifyEntityQuery } = require('./entityClassifier.service');

const ENTITY_QUERY_PATTERNS = [
  /tell me about/i,
  /what did .* say about/i,
  /what does .* say about/i,
  /what was discussed about/i,
  /about [a-z0-9\s.'-]+/i,
];

const shouldRunEntityRetrieval = (query = '') =>
  ENTITY_QUERY_PATTERNS.some((pattern) => pattern.test(query));

const extractEntityCandidate = (query = '') => {
  const cleaned = String(query)
    .toLowerCase()
    .replace(/tell me about/g, '')
    .replace(/what did he say about/g, '')
    .replace(/what did she say about/g, '')
    .replace(/what did they say about/g, '')
    .replace(/what does he say about/g, '')
    .replace(/what was discussed about/g, '')
    .replace(/[?.!,]/g, '')
    .trim();

  return cleaned;
};

const parseJsonObject = (text = '') => {
  try {
    const cleaned = String(text)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { terms: [], chunkIndexes: [] };
    }

    return {
      terms: Array.isArray(parsed.terms)
        ? parsed.terms
            .map((item) => String(item).trim())
            .filter(Boolean)
            .slice(0, 12)
        : [],
      chunkIndexes: Array.isArray(parsed.chunkIndexes)
        ? parsed.chunkIndexes
            .map((item) => Number.parseInt(item, 10))
            .filter((item) => Number.isInteger(item) && item >= 0)
            .slice(0, 12)
        : [],
    };
  } catch (_error) {
    return { terms: [], chunkIndexes: [] };
  }
};

const buildTranscriptScanSample = async ({ video }) => {
  const chunks = await TranscriptChunk.find({ video: video._id })
    .sort({ chunkIndex: 1 })
    .select('chunkIndex text')
    .lean();

  return chunks
    .map((chunk) => {
      const text = String(chunk.text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 320);
      return `[chunk ${chunk.chunkIndex}] ${text}`;
    })
    .join('\n')
    .slice(0, 14000);
};

const findEntityMentions = async ({ video, query }) => {
  const startedAt = Date.now();

  const classification = await classifyEntityQuery({ video, query });

  if (!classification.isEntityQuery || !classification.entity) {
    logInfo('rag.entity_lookup.skipped', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      reason: classification.reason || 'not_entity_query',
      classifierConfidence: classification.confidence,
    });

    return { terms: [], chunkIndexes: [] };
  }

  const entityCandidate = classification.entity;

  const transcriptSample = await buildTranscriptScanSample({ video });

  const prompt = `
Find transcript mentions for the user's requested entity.

User question:
${query}

Classified entity:
${entityCandidate}

Transcript chunks:
${transcriptSample}

Rules:
- Return ONLY valid JSON.
- Find exact words/phrases from the transcript that refer to the entity candidate.
- Handle mixed-language transcripts.
- If English entity appears in Telugu/Hindi/other script, return the transcript-script version too.
- Return chunk indexes where this entity is discussed.
- Do not return broad topic words.
- If no clear match, return {"terms":[],"chunkIndexes":[]}.

JSON shape:
{
  "terms": ["exact transcript term", "entity variant"],
  "chunkIndexes": [1, 2]
}
`.trim();

  try {
    const raw = await generateAnswer(prompt, {
      source: 'entity_retrieval',
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      mode: 'entity_lookup',
    });

    const result = parseJsonObject(raw);

    logInfo('rag.entity_lookup.completed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      entityCandidate,
      terms: result.terms,
      chunkIndexes: result.chunkIndexes,
      durationMs: getDurationMs(startedAt),
    });

    return result;
  } catch (error) {
    logError('rag.entity_lookup.failed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      entityCandidate,
      error: error.message,
      durationMs: getDurationMs(startedAt),
    });

    return { terms: [], chunkIndexes: [] };
  }
};

const searchEntityAwareChunks = async ({ video, query, limit = 4 }) => {
  const startedAt = Date.now();

  const entityResult = await findEntityMentions({ video, query });

  if (!entityResult.chunkIndexes.length && !entityResult.terms.length) {
    return [];
  }

  const expandedIndexes = new Set();

  entityResult.chunkIndexes.forEach((index) => {
    expandedIndexes.add(index);
    expandedIndexes.add(index - 1);
    expandedIndexes.add(index + 1);
  });

  const validIndexes = [...expandedIndexes].filter((index) => index >= 0);

  const conditions = [];

  if (validIndexes.length) {
    conditions.push({ chunkIndex: { $in: validIndexes } });
  }

  if (entityResult.terms.length) {
    conditions.push({
      $or: entityResult.terms.map((term) => ({
        text: { $regex: String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      })),
    });
  }

  if (!conditions.length) return [];

  const chunks = await TranscriptChunk.find({
    video: video._id,
    $or: conditions,
  })
    .sort({ chunkIndex: 1 })
    .limit(limit)
    .lean();

  const matches = chunks.map((chunk, index) => ({
    ...chunk,
    score: 0.95 - index * 0.03,
    entityScore: 0.95 - index * 0.03,
    retrievalSource: 'entity',
    entityRank: index + 1,
    entityTerms: entityResult.terms,
  }));

  logInfo('rag.entity_search.completed', {
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    query,
    entityTerms: entityResult.terms,
    entityChunkIndexes: entityResult.chunkIndexes,
    matchCount: matches.length,
    durationMs: getDurationMs(startedAt),
  });

  return matches;
};

module.exports = {
  searchEntityAwareChunks,
};
