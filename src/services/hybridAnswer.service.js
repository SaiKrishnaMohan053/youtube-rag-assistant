const TranscriptChunk = require('../models/transcriptChunk.model');
const { getOrCreateVideoSummary } = require('./summary.service');
const { searchVideoEmbeddings } = require('./embeddingClient.service');

const PROMO_PATTERNS = [
  /subscribe/i,
  /follow/i,
  /instagram/i,
  /youtube channel/i,
  /like and share/i,
  /comment below/i,
  /link in bio/i,
  /check out/i,
  /join.*course/i,
  /masterclass/i,
  /click.*link/i,
  /course/i,
  /promotion/i,
  /money back/i,
  /refund/i,
  /live session/i,
  /handholding/i,
  /career advancement/i,
  /speak with confidence/i,
  /communication masterclass/i,
];

const BROAD_ACTION_PATTERNS = [
  /create notes/i,
  /make notes/i,
  /notes from this video/i,
  /detailed notes from this video/i,
  /summarize/i,
  /summary/i,
  /key takeaways/i,
  /linkedin post/i,
  /tweet thread/i,
  /blog outline/i,
  /action items/i,
];

const SPECIFIC_QUERY_PATTERNS = [
  /about/i,
  /specific/i,
  /deep dive/i,
  /technical/i,
  /explain .*section/i,
  /what did .* say about/i,
  /what does .* say about/i,
];

const isPromoChunk = (text = '') => {
  const cleanText = String(text).toLowerCase();
  return PROMO_PATTERNS.some((pattern) => pattern.test(cleanText));
};

const cleanText = (text = '') =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (text = '', max = 900) => {
  const cleaned = cleanText(text);
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
};

const formatChunkForPrompt = (chunk, index) => {
  const time =
    chunk.startTime !== null && chunk.startTime !== undefined
      ? ` timestamp=${chunk.startTime}s`
      : '';

  return `[${index + 1}${time}] ${truncate(chunk.text)}`;
};

const isSpecificGroundingQuery = (query = '') => {
  const q = String(query).toLowerCase();

  return SPECIFIC_QUERY_PATTERNS.some((pattern) => pattern.test(q));
};

const isBroadActionQuery = (query = '') => {
  const q = String(query).toLowerCase();

  return BROAD_ACTION_PATTERNS.some((pattern) => pattern.test(q)) && !isSpecificGroundingQuery(q);
};

const getSemanticGroundingChunks = async ({ video, query, topK = 5 }) => {
  const searchResponse = await searchVideoEmbeddings({
    videoId: video.videoId,
    query,
    topK,
  });

  const matches = Array.isArray(searchResponse.matches) ? searchResponse.matches : [];

  const filteredMatches = matches.filter((chunk) => !isPromoChunk(chunk.text));

  return filteredMatches.length ? filteredMatches : matches;
};

const getDistributedGroundingChunks = async ({ video, maxChunks = 10 }) => {
  const chunks = await TranscriptChunk.find({ video: video._id }).sort({ chunkIndex: 1 }).lean();

  if (!chunks.length) return [];

  const cleanChunks = chunks.filter((chunk) => chunk.text && !isPromoChunk(chunk.text));
  const sourceChunks = cleanChunks.length ? cleanChunks : chunks;

  const total = sourceChunks.length;
  const selectedIndexes = new Set();

  // Beginning
  for (let i = 0; i < Math.min(3, total); i += 1) {
    selectedIndexes.add(i);
  }

  // 25%
  const quarter = Math.floor(total * 0.25);
  for (let i = Math.max(0, quarter - 1); i <= Math.min(total - 1, quarter + 1); i += 1) {
    selectedIndexes.add(i);
  }

  // Middle
  const middle = Math.floor(total * 0.5);
  for (let i = Math.max(0, middle - 1); i <= Math.min(total - 1, middle + 1); i += 1) {
    selectedIndexes.add(i);
  }

  // 75%
  const late = Math.floor(total * 0.75);
  for (let i = Math.max(0, late - 1); i <= Math.min(total - 1, late + 1); i += 1) {
    selectedIndexes.add(i);
  }

  // Ending, but avoid last promo/outro-heavy chunk if possible
  for (let i = Math.max(0, total - 3); i < total; i += 1) {
    selectedIndexes.add(i);
  }

  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => sourceChunks[index])
    .filter(Boolean)
    .slice(0, maxChunks);
};

const buildHybridContext = ({ summary, chunks }) => {
  const summaryContext = `
Full-video summary:
${summary.detailedSummary || summary.shortSummary || 'N/A'}

Main topics:
${summary.mainTopics?.map((item) => `- ${item}`).join('\n') || 'N/A'}

Key takeaways:
${summary.keyTakeaways?.map((item) => `- ${item}`).join('\n') || 'N/A'}

People:
${
  summary.people
    ?.map((person) => {
      const talkedAbout = person.talkedAbout?.map((item) => `  - ${item}`).join('\n') || '';
      return `- ${person.name}: ${person.summary}${talkedAbout ? `\n${talkedAbout}` : ''}`;
    })
    .join('\n') || 'N/A'
}

Topics:
${
  summary.topics
    ?.map((topic) => {
      const keyPoints = topic.keyPoints?.map((item) => `  - ${item}`).join('\n') || '';
      return `- ${topic.name}: ${topic.summary}${keyPoints ? `\n${keyPoints}` : ''}`;
    })
    .join('\n') || 'N/A'
}
`.trim();

  const chunkContext = chunks.length
    ? chunks.map((chunk, index) => formatChunkForPrompt(chunk, index)).join('\n\n')
    : 'No detailed chunks were retrieved.';

  return `
${summaryContext}

Detailed transcript grounding:
${chunkContext}
`.trim();
};

const getHybridGrounding = async ({ video, query, topK = 5, strategy = 'auto' }) => {
  const summary = await getOrCreateVideoSummary(video);

  let selectedStrategy = strategy;

  if (strategy === 'auto') {
    selectedStrategy = isBroadActionQuery(query) ? 'distributed' : 'semantic';
  }

  let chunks = [];

  if (selectedStrategy === 'distributed') {
    chunks = await getDistributedGroundingChunks({
      video,
      maxChunks: 10,
    });
  } else {
    chunks = await getSemanticGroundingChunks({
      video,
      query,
      topK,
    }).catch(() => []);
  }

  return {
    summary,
    chunks,
    strategy: selectedStrategy,
    context: buildHybridContext({
      summary,
      chunks,
    }),
  };
};

module.exports = {
  getHybridGrounding,
  getSemanticGroundingChunks,
  getDistributedGroundingChunks,
  buildHybridContext,
  isBroadActionQuery,
  isSpecificGroundingQuery,
};
