const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAnswer } = require('./llm.service');
const { logInfo, logError, getDurationMs } = require('../utils/logger');

const parseJsonObject = (text = '') => {
  try {
    const cleaned = String(text)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { shouldUseTopicRetrieval: false, topic: null, terms: [], chunkIndexes: [] };
    }

    return {
      shouldUseTopicRetrieval: Boolean(parsed.shouldUseTopicRetrieval),
      topic: typeof parsed.topic === 'string' && parsed.topic.trim() ? parsed.topic.trim() : null,
      terms: Array.isArray(parsed.terms)
        ? parsed.terms
            .map((item) => String(item).trim())
            .filter(Boolean)
            .slice(0, 16)
        : [],
      chunkIndexes: Array.isArray(parsed.chunkIndexes)
        ? parsed.chunkIndexes
            .map((item) => Number.parseInt(item, 10))
            .filter((item) => Number.isInteger(item) && item >= 0)
            .slice(0, 12)
        : [],
      confidence:
        typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
    };
  } catch (_error) {
    return { shouldUseTopicRetrieval: false, topic: null, terms: [], chunkIndexes: [] };
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
        .slice(0, 360);
      return `[chunk ${chunk.chunkIndex}] ${text}`;
    })
    .join('\n')
    .slice(0, 16000);
};

const findTopicMentions = async ({ video, query }) => {
  const startedAt = Date.now();

  const transcriptSample = await buildTranscriptScanSample({ video });

  const prompt = `
You are selecting transcript chunks that directly answer a topic/question.

User question:
${query}

Transcript chunks:
${transcriptSample}

Task:
Decide if this question needs topic retrieval.

Use topic retrieval for:
- why / reason / cause questions
- how questions
- questions about a concept, policy, event, issue, update, rule, benefit, problem, risk, impact
- timestamp topic questions
- specific fact questions where answer may appear in a later part of transcript

Do NOT use topic retrieval for:
- full video summary
- broad "summarize this video"
- named entity lookup only, such as a company/person/product name

Rules:
- Return ONLY valid JSON.
- Pick chunk indexes that directly discuss the answer.
- Prefer chunks that explain cause/reason if the user asks "why".
- Include exact transcript words/phrases useful for searching.
- Do not return unrelated broad terms.
- If no direct chunks are visible, return shouldUseTopicRetrieval false.

JSON shape:
{
  "shouldUseTopicRetrieval": true,
  "topic": "short topic name",
  "terms": ["exact transcript/search terms"],
  "chunkIndexes": [1, 2, 3],
  "confidence": 0.0
}
`.trim();

  try {
    const raw = await generateAnswer(prompt, {
      source: 'topic_retrieval',
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      mode: 'topic_lookup',
    });

    const result = parseJsonObject(raw);

    const finalResult =
      result.shouldUseTopicRetrieval &&
      result.confidence >= 0.7 &&
      (result.chunkIndexes.length || result.terms.length)
        ? result
        : {
            shouldUseTopicRetrieval: false,
            topic: result.topic || null,
            terms: [],
            chunkIndexes: [],
            confidence: result.confidence || 0,
          };

    logInfo('rag.topic_lookup.completed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      ...finalResult,
      durationMs: getDurationMs(startedAt),
    });

    return finalResult;
  } catch (error) {
    logError('rag.topic_lookup.failed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      error: error.message,
      durationMs: getDurationMs(startedAt),
    });

    return {
      shouldUseTopicRetrieval: false,
      topic: null,
      terms: [],
      chunkIndexes: [],
      confidence: 0,
    };
  }
};

const searchTopicAwareChunks = async ({ video, query, limit = 4 }) => {
  const startedAt = Date.now();

  const topicResult = await findTopicMentions({ video, query });

  if (!topicResult.shouldUseTopicRetrieval) {
    return [];
  }

  const directIndexes = topicResult.chunkIndexes.filter((index) => index >= 0);

  const neighborIndexes = [];

  directIndexes.forEach((index) => {
    if (index - 1 >= 0) neighborIndexes.push(index - 1);
    neighborIndexes.push(index + 1);
  });

  const validIndexes = [...new Set([...directIndexes, ...neighborIndexes])];

  let chunks = [];

  if (validIndexes.length) {
    const fetchedChunks = await TranscriptChunk.find({
      video: video._id,
      chunkIndex: { $in: validIndexes },
    }).lean();

    const chunkMap = new Map(fetchedChunks.map((chunk) => [chunk.chunkIndex, chunk]));

    chunks = validIndexes
      .map((index) => chunkMap.get(index))
      .filter(Boolean)
      .slice(0, limit);
  }

  chunks = chunks.slice(0, limit);

  const matches = chunks.map((chunk, index) => ({
    ...chunk,
    score: 0.85 - index * 0.03,
    topicScore: 0.85 - index * 0.03,
    retrievalSource: 'topic',
    topicRank: index + 1,
    topic: topicResult.topic,
    topicTerms: topicResult.terms,
  }));

  logInfo('rag.topic_search.completed', {
    videoMongoId: video._id.toString(),
    youtubeVideoId: video.videoId,
    query,
    topic: topicResult.topic,
    topicTerms: topicResult.terms,
    topicChunkIndexes: topicResult.chunkIndexes,
    matchCount: matches.length,
    durationMs: getDurationMs(startedAt),
  });

  return matches;
};

module.exports = {
  searchTopicAwareChunks,
};
