const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAnswer } = require('./llm.service');
const { logInfo, logError, getDurationMs } = require('../utils/logger');

const STOP_SEARCH_TERMS = new Set([
  'why',
  'how',
  'what',
  'the',
  'and',
  'for',
  'with',
  'market',
  'volatility',
  'impact',
  'update',
  'updates',
  'tell',
  'say',
  'about',
  'did',
  'were',
  'discussed',
  'show',
  'timestamps',
]);

const parseJsonArray = (text = '') => {
  try {
    const cleaned = String(text)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch (_error) {
    return [];
  }
};

const getBasicQueryTerms = (query = '') =>
  String(query)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 8);

const expandQueryTerms = async ({ query, video }) => {
  const startedAt = Date.now();

  const fallbackTerms = getBasicQueryTerms(query);

  const summaryHints = [
    video?.title,
    video?.summary?.shortSummary,
    ...(video?.summary?.mainTopics || []),
    ...(video?.summary?.keyTakeaways || []),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1800);

  const totalChunks = await TranscriptChunk.countDocuments({ video: video._id });

  const firstChunks = await TranscriptChunk.find({ video: video._id })
    .sort({ chunkIndex: 1 })
    .limit(4)
    .select('chunkIndex text')
    .lean();

  const middleStart = Math.max(0, Math.floor(totalChunks / 2) - 2);
  const middleChunks = await TranscriptChunk.find({ video: video._id })
    .sort({ chunkIndex: 1 })
    .skip(middleStart)
    .limit(4)
    .select('chunkIndex text')
    .lean();

  const lastStart = Math.max(0, totalChunks - 6);
  const lastChunks = await TranscriptChunk.find({ video: video._id })
    .sort({ chunkIndex: 1 })
    .skip(lastStart)
    .limit(6)
    .select('chunkIndex text')
    .lean();

  const sampleChunks = [...firstChunks, ...middleChunks, ...lastChunks];

  const transcriptSample = sampleChunks
    .map((chunk) => `[chunk ${chunk.chunkIndex}]\n${chunk.text}`)
    .join('\n\n')
    .slice(0, 5000);

  const prompt = `
    Generate search keywords for retrieving transcript chunks.

    User question:
    ${query}

    Video title / summary hints:
    ${summaryHints || 'No video summary available.'}

    Transcript sample:
    ${transcriptSample || 'No transcript sample available.'}

    Rules:
    - Return ONLY a JSON array of strings.
    - Include original important English terms.
    - Do not replace specific company/person/entity names from the user question.
    - If the user asks about a company or named entity, include that exact name and close spelling variants.
    - Copy useful matching terms exactly from the transcript sample when possible.
    - If user asks about an entity, search the transcript sample for similar sounding/spelled terms and include those exact transcript terms.
    - Do not add broad video topics unless they directly help retrieve that entity.
    - Include terms that are likely to appear inside the transcript.
    - Match the transcript language/script/style from the transcript sample.
    - If transcript is Telugu, include Telugu words from the sample or likely Telugu equivalents.
    - If transcript is mixed English + Telugu, include mixed terms too.
    - Keep each term short, 1 to 4 words.
    - Return 8 to 15 terms.
    - No explanation.
    `.trim();

  try {
    const raw = await generateAnswer(prompt, {
      source: 'query_expansion',
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      mode: 'query_expansion',
    });

    const expandedTerms = parseJsonArray(raw);

    const terms = [...new Set([...fallbackTerms, ...expandedTerms])]
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
      .filter((term) => !STOP_SEARCH_TERMS.has(term.toLowerCase()))
      .slice(0, 16);

    logInfo('rag.query_expansion.completed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      fallbackTermCount: fallbackTerms.length,
      expandedTermCount: expandedTerms.length,
      finalTermCount: terms.length,
      terms,
      durationMs: getDurationMs(startedAt),
    });

    return terms;
  } catch (error) {
    logError('rag.query_expansion.failed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      error: error.message,
      durationMs: getDurationMs(startedAt),
    });

    return fallbackTerms;
  }
};

module.exports = {
  expandQueryTerms,
  getBasicQueryTerms,
};
