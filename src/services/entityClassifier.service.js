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
      return {
        isEntityQuery: false,
        entity: null,
        confidence: 0,
        reason: 'invalid_json',
      };
    }

    return {
      isEntityQuery: Boolean(parsed.isEntityQuery),
      entity:
        typeof parsed.entity === 'string' && parsed.entity.trim() ? parsed.entity.trim() : null,
      confidence:
        typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 180) : '',
    };
  } catch (_error) {
    return {
      isEntityQuery: false,
      entity: null,
      confidence: 0,
      reason: 'parse_failed',
    };
  }
};

const classifyEntityQuery = async ({ query, video }) => {
  const startedAt = Date.now();

  const prompt = `
Classify whether the user is asking about a named entity in a video transcript.

User question:
${query}

Definitions:
- Named entity = a specific company, person, product, organization, project, place, stock name, brand, institution, or named event.
- Topic/concept = broad subject like inflation, rupee weakness, tax benefits, market volatility, gold investment, interest rates, timestamps, summary, reasons, steps, process, overview.

Return true ONLY when the user is asking about a specific named entity.

Examples:
Question: "Tell me about Blue Spring"
Output: {"isEntityQuery":true,"entity":"Blue Spring","confidence":0.95,"reason":"Specific company/entity name"}

Question: "What did he say about ICICI?"
Output: {"isEntityQuery":true,"entity":"ICICI","confidence":0.95,"reason":"Specific organization name"}

Question: "What did he say about HDFC?"
Output: {"isEntityQuery":true,"entity":"HDFC","confidence":0.95,"reason":"Specific organization name"}

Question: "Why is rupee weakening?"
Output: {"isEntityQuery":false,"entity":null,"confidence":0.9,"reason":"Rupee weakness is a topic, not a named entity"}

Question: "What tax benefits were discussed?"
Output: {"isEntityQuery":false,"entity":null,"confidence":0.9,"reason":"Tax benefits is a topic"}

Question: "Show timestamps for FII discussion"
Output: {"isEntityQuery":false,"entity":null,"confidence":0.85,"reason":"This asks for a topic/timestamp search"}

Question: "What did he say about Sundar Pichai?"
Output: {"isEntityQuery":true,"entity":"Sundar Pichai","confidence":0.95,"reason":"Specific person name"}

Rules:
- Return ONLY valid JSON.
- Do not explain outside JSON.
- If unsure, return false.
- Entity must be the exact entity phrase from the user question.
- Do not classify broad topics as entities.

JSON shape:
{
  "isEntityQuery": true,
  "entity": "entity name or null",
  "confidence": 0.0,
  "reason": "short reason"
}
`.trim();

  try {
    const raw = await generateAnswer(prompt, {
      source: 'entity_classifier',
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      mode: 'entity_classifier',
    });

    const result = parseJsonObject(raw);

    const finalResult =
      result.isEntityQuery && result.entity && result.confidence >= 0.75
        ? result
        : {
            ...result,
            isEntityQuery: false,
            entity: null,
          };

    logInfo('rag.entity_classifier.completed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      ...finalResult,
      durationMs: getDurationMs(startedAt),
    });

    return finalResult;
  } catch (error) {
    logError('rag.entity_classifier.failed', {
      videoMongoId: video?._id?.toString(),
      youtubeVideoId: video?.videoId,
      query,
      error: error.message,
      durationMs: getDurationMs(startedAt),
    });

    return {
      isEntityQuery: false,
      entity: null,
      confidence: 0,
      reason: 'classifier_failed',
    };
  }
};

module.exports = {
  classifyEntityQuery,
};
