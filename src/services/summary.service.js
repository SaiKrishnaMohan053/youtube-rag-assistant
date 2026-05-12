const TranscriptChunk = require('../models/transcriptChunk.model');
const { generateAnswer } = require('./llm.service');
const ApiError = require('../utils/apiError');

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

const isPromoText = (text = '') => {
  const cleanText = String(text).toLowerCase();
  return PROMO_PATTERNS.some((pattern) => pattern.test(cleanText));
};

const cleanText = (text = '') =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (text = '', max = 1200) => {
  const cleaned = cleanText(text);
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
};

const safeJsonParse = (value) => {
  try {
    const jsonStart = value.indexOf('{');
    const jsonEnd = value.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;

    return JSON.parse(value.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
};

const getCleanChunks = async (videoId) => {
  const chunks = await TranscriptChunk.find({ video: videoId }).sort({ chunkIndex: 1 }).lean();

  if (!chunks.length) {
    throw new ApiError(400, 'No transcript chunks found for this video');
  }

  const filteredChunks = chunks.filter((chunk) => !isPromoText(chunk.text));
  return filteredChunks.length ? filteredChunks : chunks;
};

const buildChunkSummaryPrompt = (chunks) => {
  const context = chunks
    .map((chunk) => {
      const time =
        chunk.startTime !== null && chunk.startTime !== undefined
          ? `timestamp=${chunk.startTime}s`
          : 'timestamp=unknown';

      return `[chunk ${chunk.chunkIndex}, ${time}] ${truncate(chunk.text, 1200)}`;
    })
    .join('\n\n');

  return `
You are analyzing part of a YouTube transcript.

Task:
Summarize this transcript section.

Rules:
- Focus only on meaningful discussion.
- Ignore subscribe/follow/social media promotion.
- Keep important topics, people, claims, examples, and decisions.
- Do not invent anything.

Transcript section:
${context}

Return 5-8 bullet points.
`.trim();
};

const buildFinalSummaryPrompt = ({ video, sectionSummaries }) => {
  return `
You are creating a full-video understanding summary from section summaries.

Video title:
${video.title || 'Untitled video'}

Section summaries:
${sectionSummaries.map((summary, index) => `Section ${index + 1}:\n${summary}`).join('\n\n')}

Return ONLY valid JSON with this exact shape:
{
  "shortSummary": "2-3 sentence overview of the full video",
  "detailedSummary": "Detailed but clear full-video summary",
  "mainTopics": ["topic 1", "topic 2"],
  "keyTakeaways": ["takeaway 1", "takeaway 2"],
  "people": [
    {
      "name": "Person name",
      "summary": "What this person mainly talked about",
      "talkedAbout": ["point 1", "point 2"]
    }
  ],
  "topics": [
    {
      "name": "Topic name",
      "summary": "What the video says about this topic",
      "keyPoints": ["point 1", "point 2"]
    }
  ]
}

Rules:
- Do not include markdown.
- Do not include text outside JSON.
- If a person name is unclear, use "Main speaker".
- Keep arrays concise.
`.trim();
};

const chunkArray = (items, size) => {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
};

const normalizeSummaryPayload = (payload = {}) => ({
  shortSummary: payload.shortSummary || '',
  detailedSummary: payload.detailedSummary || '',
  mainTopics: Array.isArray(payload.mainTopics) ? payload.mainTopics : [],
  keyTakeaways: Array.isArray(payload.keyTakeaways) ? payload.keyTakeaways : [],
  people: Array.isArray(payload.people) ? payload.people : [],
  topics: Array.isArray(payload.topics) ? payload.topics : [],
  generatedAt: new Date(),
});

const generateAndSaveVideoSummary = async (video) => {
  const chunks = await getCleanChunks(video._id);

  video.summaryStatus = 'pending';
  video.summaryError = null;
  if (typeof video.save === 'function') {
    await video.save();
  }

  try {
    const chunkGroups = chunkArray(chunks, 8);

    const sectionSummaries = [];

    for (const group of chunkGroups) {
      const prompt = buildChunkSummaryPrompt(group);
      const sectionSummary = await generateAnswer(prompt);
      sectionSummaries.push(sectionSummary);
    }

    const finalPrompt = buildFinalSummaryPrompt({
      video,
      sectionSummaries,
    });

    const rawSummary = await generateAnswer(finalPrompt);
    const parsedSummary = safeJsonParse(rawSummary) || {
      shortSummary: rawSummary,
      detailedSummary: rawSummary,
      mainTopics: [],
      keyTakeaways: [],
      people: [],
      topics: [],
    };

    video.summary = normalizeSummaryPayload(parsedSummary);
    video.summaryStatus = 'completed';
    video.summaryError = null;

    if (typeof video.save === 'function') {
      await video.save();
    }

    return video.summary;
  } catch (error) {
    video.summaryStatus = 'failed';
    video.summaryError = error.message || 'Summary generation failed';

    if (typeof video.save === 'function') {
      await video.save();
    }

    throw error;
  }
};

const getOrCreateVideoSummary = async (video) => {
  if (video.summaryStatus === 'completed' && video.summary?.detailedSummary) {
    return video.summary;
  }

  return generateAndSaveVideoSummary(video);
};

const answerFromVideoSummary = async ({ video, query }) => {
  const summary = await getOrCreateVideoSummary(video);

  const prompt = `
Use the saved full-video summary to answer the user's overview question.

User question:
${query}

Video summary:
${summary.detailedSummary}

Main topics:
${summary.mainTopics?.join(', ') || 'N/A'}

Key takeaways:
${summary.keyTakeaways?.map((item) => `- ${item}`).join('\n') || 'N/A'}

Answer format:
1. What the video is about
2. Main points
`.trim();

  return generateAnswer(prompt);
};

const answerFromEntitySummary = async ({ video, query, entity }) => {
  const summary = await getOrCreateVideoSummary(video);

  const person = summary.people?.find(
    (item) => item.name && item.name.toLowerCase() === String(entity).toLowerCase()
  );

  const context = person
    ? `
Person:
${person.name}

Person summary:
${person.summary}

Talked about:
${person.talkedAbout?.map((item) => `- ${item}`).join('\n') || 'N/A'}
`.trim()
    : `
Full video summary:
${summary.detailedSummary}

People:
${summary.people?.map((item) => `${item.name}: ${item.summary}`).join('\n') || 'N/A'}
`.trim();

  const prompt = `
Answer the user's question using the video summary context.

User question:
${query}

Target entity:
${entity}

Context:
${context}

Rules:
- If the exact person is not clearly found, answer from the available full-video summary.
- Do not invent details.
- Be clear and concise.
`.trim();

  return generateAnswer(prompt);
};

const answerFromTopicSummary = async ({ video, query, topic }) => {
  const summary = await getOrCreateVideoSummary(video);

  const matchedTopic = summary.topics?.find(
    (item) => item.name && item.name.toLowerCase() === String(topic).toLowerCase()
  );

  const context = matchedTopic
    ? `
Topic:
${matchedTopic.name}

Topic summary:
${matchedTopic.summary}

Key points:
${matchedTopic.keyPoints?.map((item) => `- ${item}`).join('\n') || 'N/A'}
`.trim()
    : `
Full video summary:
${summary.detailedSummary}

Topics:
${summary.topics?.map((item) => `${item.name}: ${item.summary}`).join('\n') || 'N/A'}
`.trim();

  const prompt = `
Answer the user's question using the video topic summary context.

User question:
${query}

Target topic:
${topic}

Context:
${context}

Rules:
- If the exact topic is not clearly found, answer from the available full-video summary.
- Do not invent details.
- Be clear and concise.
`.trim();

  return generateAnswer(prompt);
};

module.exports = {
  getOrCreateVideoSummary,
  generateAndSaveVideoSummary,
  answerFromVideoSummary,
  answerFromEntitySummary,
  answerFromTopicSummary,
};
