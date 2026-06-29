const axios = require('axios');
const { EVAL_CASES } = require('./evalCases');
const { judgeGroundedness } = require('./groundednessJudge');

const BASE_URL = process.env.EVAL_BASE_URL || 'http://localhost:5000';

const now = () => Date.now();

const getEvalErrorMessage = (error) => {
  const data = error.response?.data;

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;

  if (typeof data === 'string') return data;

  if (error.message) return error.message;

  return 'Eval case failed';
};

const containsRefusal = (answer = '') => {
  const clean = String(answer).toLowerCase();

  return (
    clean.includes("i don't have enough transcript context") ||
    clean.includes('not supported by the transcript') ||
    clean.includes('cannot answer from the transcript')
  );
};

const hasTimestampFormat = (answer = '') => /\b\d{1,2}:\d{2}\b/.test(String(answer));

const getLatencyScore = (latencyMs = 0) => {
  if (latencyMs <= 3000) return 1;
  if (latencyMs <= 7000) return 0.8;
  if (latencyMs <= 12000) return 0.6;
  if (latencyMs <= 20000) return 0.4;
  return 0.2;
};

const getCompletenessScore = ({ answer = '', category }) => {
  const length = answer.length;

  if (category === 'action_extraction') {
    if (length >= 1500) return 1;
    if (length >= 800) return 0.7;
    return 0.4;
  }

  if (category === 'guest_summary' || category === 'video_overview') {
    if (length >= 500) return 1;
    if (length >= 250) return 0.7;
    return 0.4;
  }

  if (length >= 120) return 1;
  if (length >= 60) return 0.7;
  return 0.4;
};

const getGroundednessScore = ({ answer = '', supportingChunks = [], category }) => {
  if (category === 'guest_summary' || category === 'guest_qa') {
    return containsRefusal(answer) ? 0.6 : 0.8;
  }

  if (
    category === 'video_overview' ||
    category === 'entity_overview' ||
    category === 'topic_overview'
  ) {
    return containsRefusal(answer) ? 0.5 : 0.8;
  }

  if (!supportingChunks.length) return 0.3;
  if (containsRefusal(answer)) return 0.6;

  return 1;
};

const getHallucinationRisk = ({ answer = '', supportingChunks = [] }) => {
  const clean = String(answer).toLowerCase();

  const riskyPhrases = [
    'according to research',
    'studies show',
    'experts agree',
    'in 2024',
    'in 2025',
    'latest data',
    'statistically',
  ];

  const hasRiskyPhrase = riskyPhrases.some((phrase) => clean.includes(phrase));

  if (hasRiskyPhrase && !supportingChunks.length) return 'high';
  if (hasRiskyPhrase) return 'medium';
  return 'low';
};

const getWeightedScore = ({ relevanceScore, groundednessScore, completenessScore, latencyScore }) =>
  Number(
    (
      relevanceScore * 0.3 +
      groundednessScore * 0.3 +
      completenessScore * 0.25 +
      latencyScore * 0.15
    ).toFixed(2)
  );

const getGrade = (score) => {
  if (score >= 0.9) return 'A';
  if (score >= 0.8) return 'B';
  if (score >= 0.7) return 'C';
  if (score >= 0.6) return 'D';
  return 'F';
};

const keywordScore = (answer = '', keywords = []) => {
  if (!keywords.length) return 1;

  const clean = String(answer).toLowerCase();

  const matches = keywords.filter((keyword) => clean.includes(String(keyword).toLowerCase()));

  return matches.length / keywords.length;
};

const normalizeText = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getChunkText = (chunk = {}) => normalizeText(chunk.text || '');

const calculateRetrievalMetrics = ({ supportingChunks = [], expectedEvidence = [] }) => {
  const evidence = expectedEvidence.map((item) => normalizeText(item)).filter(Boolean);

  const retrievedChunkIndexes = supportingChunks
    .map((chunk) => chunk.chunkIndex)
    .filter((value) => value !== undefined && value !== null);

  const retrievedChunkScores = supportingChunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    score: chunk.score ?? chunk.finalRetrievalScore ?? null,
    retrievalSource: chunk.retrievalSource ?? null,
    vectorRank: chunk.vectorRank ?? null,
    keywordRank: chunk.keywordRank ?? null,
  }));

  if (!evidence.length) {
    return {
      retrievalEvaluated: false,
      retrievalHitRate: null,
      precisionAtK: null,
      recallAtK: null,
      mrr: null,
      matchedEvidence: [],
      missingEvidence: [],
      retrievedChunkIndexes,
      retrievedChunkScores,
    };
  }

  const matchedEvidence = [];
  const missingEvidence = [];
  const matchingRanks = [];

  for (const phrase of evidence) {
    const foundIndex = supportingChunks.findIndex((chunk) => getChunkText(chunk).includes(phrase));

    if (foundIndex >= 0) {
      matchedEvidence.push(phrase);
      matchingRanks.push(foundIndex + 1);
    } else {
      missingEvidence.push(phrase);
    }
  }

  const uniqueMatchingChunkRanks = new Set();

  supportingChunks.forEach((chunk, index) => {
    const chunkText = getChunkText(chunk);
    const hasMatch = evidence.some((phrase) => chunkText.includes(phrase));

    if (hasMatch) {
      uniqueMatchingChunkRanks.add(index + 1);
    }
  });

  const retrievedCount = supportingChunks.length;
  const matchedChunkCount = uniqueMatchingChunkRanks.size;

  const precisionAtK =
    retrievedCount > 0 ? Number((matchedChunkCount / retrievedCount).toFixed(2)) : 0;

  const recallAtK = Number((matchedEvidence.length / evidence.length).toFixed(2));

  const retrievalHitRate = matchedEvidence.length > 0 ? 1 : 0;

  const bestRank = matchingRanks.length ? Math.min(...matchingRanks) : null;
  const mrr = bestRank ? Number((1 / bestRank).toFixed(2)) : 0;

  return {
    retrievalEvaluated: true,
    retrievalHitRate,
    precisionAtK,
    recallAtK,
    mrr,
    matchedEvidence,
    missingEvidence,
    retrievedChunkIndexes,
    retrievedChunkScores,
  };
};

const runAuthEval = async ({ caseItem, videoId, token }) => {
  const startedAt = now();

  const response = await axios.post(
    `${BASE_URL}/api/videos/${videoId}/ask`,
    {
      query: caseItem.question,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const latencyMs = now() - startedAt;

  const data = response.data?.data || {};

  const answer = data.answer || '';
  const supportingChunks = Array.isArray(data.supportingChunks) ? data.supportingChunks : [];
  const retrievalMetrics = calculateRetrievalMetrics({
    supportingChunks,
    expectedEvidence: caseItem.expectedEvidence || [],
  });

  const relevanceScore = keywordScore(answer, caseItem.expectedKeywords);

  const groundednessJudge = await judgeGroundedness({
    answer,
    supportingChunks,
  });
  const groundednessScore =
    groundednessJudge?.score ??
    getGroundednessScore({
      answer,
      supportingChunks,
      category: caseItem.category,
    });

  const completenessScore = getCompletenessScore({
    answer,
    category: caseItem.category,
  });
  const latencyScore = getLatencyScore(latencyMs);
  const weightedScore = getWeightedScore({
    relevanceScore,
    groundednessScore,
    completenessScore,
    latencyScore,
  });

  const timestampPass = caseItem.category === 'timestamp_query' ? hasTimestampFormat(answer) : true;

  const intentPass = data.intent === caseItem.expectedIntent;
  const modePass = data.mode === caseItem.expectedMode;
  const retrievalPass =
    !retrievalMetrics.retrievalEvaluated || retrievalMetrics.retrievalHitRate === 1;

  return {
    id: caseItem.id,
    category: caseItem.category,
    passed: intentPass && modePass && timestampPass && retrievalPass && weightedScore >= 0.7,
    intentPass,
    modePass,
    timestampPass,
    retrievalPass,
    relevanceScore,
    groundednessJudge,
    groundednessScore,
    completenessScore,
    latencyScore,
    weightedScore,
    grade: getGrade(weightedScore),
    hallucinationRisk: getHallucinationRisk({
      answer,
      supportingChunks,
    }),
    latencyMs,
    answerLength: answer.length,
    supportingChunkCount: supportingChunks.length,
    intent: data.intent,
    mode: data.mode,
    retrievalEvaluated: retrievalMetrics.retrievalEvaluated,
    retrievalHitRate: retrievalMetrics.retrievalHitRate,
    precisionAtK: retrievalMetrics.precisionAtK,
    recallAtK: retrievalMetrics.recallAtK,
    mrr: retrievalMetrics.mrr,
    matchedEvidence: retrievalMetrics.matchedEvidence,
    missingEvidence: retrievalMetrics.missingEvidence,
    retrievedChunkIndexes: retrievalMetrics.retrievedChunkIndexes,
    retrievedChunkScores: retrievalMetrics.retrievedChunkScores,
  };
};

const runGuestSummaryEval = async ({ caseItem, url }) => {
  const startedAt = now();

  const response = await axios.post(`${BASE_URL}/api/guest/summary`, {
    url,
  });

  const latencyMs = now() - startedAt;

  const data = response.data?.data || {};

  const summary = data.summary || '';
  const completenessScore = getCompletenessScore({
    answer: summary,
    category: caseItem.category,
  });
  const latencyScore = getLatencyScore(latencyMs);
  const groundednessScore = getGroundednessScore({
    answer: summary,
    category: caseItem.category,
  });
  const weightedScore = getWeightedScore({
    relevanceScore: 1,
    groundednessScore,
    completenessScore,
    latencyScore,
  });

  return {
    id: caseItem.id,
    category: caseItem.category,
    passed: !!summary && weightedScore >= 0.7,
    relevanceScore: 1,
    groundednessScore,
    completenessScore,
    latencyScore,
    weightedScore,
    grade: getGrade(weightedScore),
    hallucinationRisk: getHallucinationRisk({
      answer: summary,
      supportingChunks: [],
    }),
    latencyMs,
    summaryLength: summary.length,
    sessionId: data.sessionId,
  };
};

const runGuestQaEval = async ({ caseItem, sessionId }) => {
  const startedAt = now();

  const response = await axios.post(`${BASE_URL}/api/guest/ask`, {
    sessionId,
    query: caseItem.question,
  });

  const latencyMs = now() - startedAt;

  const data = response.data?.data || {};

  const answer = data.answer || '';
  const completenessScore = getCompletenessScore({
    answer,
    category: caseItem.category,
  });
  const latencyScore = getLatencyScore(latencyMs);
  const groundednessScore = getGroundednessScore({
    answer,
    category: caseItem.category,
  });
  const weightedScore = getWeightedScore({
    relevanceScore: 1,
    groundednessScore,
    completenessScore,
    latencyScore,
  });

  return {
    id: caseItem.id,
    category: caseItem.category,
    passed: !!answer && weightedScore >= 0.7,
    relevanceScore: 1,
    groundednessScore,
    completenessScore,
    latencyScore,
    weightedScore,
    grade: getGrade(weightedScore),
    hallucinationRisk: getHallucinationRisk({
      answer,
      supportingChunks: [],
    }),
    latencyMs,
    answerLength: answer.length,
  };
};

const runEvalSuite = async ({ videoId, token, guestUrl }) => {
  const results = [];
  let guestSessionId = null;

  for (const caseItem of EVAL_CASES) {
    const caseStartedAt = now();

    try {
      let result;

      if (caseItem.routeType === 'auth') {
        result = await runAuthEval({
          caseItem,
          videoId,
          token,
        });
      } else if (caseItem.category === 'guest_summary') {
        if (!guestUrl?.trim()) {
          result = {
            id: caseItem.id,
            category: caseItem.category,
            passed: false,
            skipped: true,
            error: 'Guest URL not provided. Guest summary eval skipped.',
            latencyMs: now() - caseStartedAt,
          };
        } else {
          result = await runGuestSummaryEval({
            caseItem,
            url: guestUrl,
          });

          guestSessionId = result.sessionId;
        }
      } else if (caseItem.category === 'guest_qa') {
        if (!guestSessionId) {
          result = {
            id: caseItem.id,
            category: caseItem.category,
            passed: false,
            skipped: true,
            error: 'Guest session not available. Guest QA eval skipped.',
            latencyMs: now() - caseStartedAt,
          };
        } else {
          result = await runGuestQaEval({
            caseItem,
            sessionId: guestSessionId,
          });
        }
      }

      if (result) {
        results.push(result);
      }
    } catch (error) {
      results.push({
        id: caseItem.id,
        category: caseItem.category,
        passed: false,
        error: getEvalErrorMessage(error),
        statusCode: error.response?.status || null,
        latencyMs: now() - caseStartedAt,
      });
    }
  }

  const evaluatedResults = results.filter((r) => !r.skipped);
  const passCount = evaluatedResults.filter((r) => r.passed).length;
  const failedCount = evaluatedResults.filter((r) => !r.passed).length;
  const skippedCount = results.filter((r) => r.skipped).length;

  return {
    total: results.length,
    evaluated: evaluatedResults.length,
    passed: passCount,
    failed: failedCount,
    skipped: skippedCount,
    passRate:
      evaluatedResults.length > 0
        ? Number(((passCount / evaluatedResults.length) * 100).toFixed(2))
        : 0,
    results,
  };
};

module.exports = {
  runEvalSuite,
};
