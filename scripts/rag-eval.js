const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.EVAL_AUTH_TOKEN;
const VIDEO_ID = process.env.EVAL_VIDEO_ID;

if (!AUTH_TOKEN) {
  throw new Error('Missing EVAL_AUTH_TOKEN');
}

if (!VIDEO_ID) {
  throw new Error('Missing EVAL_VIDEO_ID');
}

const questions = [
  'What is this video about?',
  'Summarize this video',
  'Why is rupee weakening?',
  'What did RBI announce?',
  'What tax benefits were discussed?',
  'When did he talk about rupee?',
  'Show timestamps for FII discussion',
  'What did he say about ICICI?',
  'Tell me about Blue Spring',
  'What did he say about Tesla?',
  'What did he say about Nvidia earnings?',
];

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
  timeout: 120000,
});

const runEval = async () => {
  const results = [];

  for (const question of questions) {
    console.log(`\nRunning: ${question}`);

    const startedAt = Date.now();

    try {
      const response = await client.post(`/videos/${VIDEO_ID}/ask`, {
        query: question,
        topK: 4,
      });

      const data = response.data?.data;

      const supportingChunks = data?.supportingChunks || [];
      const scores = supportingChunks
        .map((chunk) => chunk.finalRetrievalScore ?? chunk.score)
        .filter((score) => typeof score === 'number');

      const avgScore =
        scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;

      results.push({
        question,
        status: 'success',
        mode: data?.mode,
        intent: data?.intent,
        answer: data?.answer,
        supportingChunkCount: supportingChunks.length,
        avgScore,
        topChunks: supportingChunks.map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          timestamp: chunk.timestamp,
          retrievalSource: chunk.retrievalSource,
          score: chunk.score,
          keywordScore: chunk.keywordScore,
          entityScore: chunk.entityScore,
          finalRetrievalScore: chunk.finalRetrievalScore,
          textPreview: String(chunk.text || '').slice(0, 280),
        })),
        durationMs: Date.now() - startedAt,
        humanRating: '',
        notes: '',
      });

      console.log(`Done: ${data?.mode} / ${data?.intent}`);
    } catch (error) {
      results.push({
        question,
        status: 'failed',
        error: error.response?.data?.message || error.message,
        durationMs: Date.now() - startedAt,
        humanRating: '',
        notes: '',
      });

      console.log(`Failed: ${error.response?.data?.message || error.message}`);
    }
  }

  const outputDir = path.join(process.cwd(), 'eval-results');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `rag-eval-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  console.log(`\nEval saved to: ${outputFile}`);
};

runEval();
