// tests/ragRetrieval.service.test.js

jest.mock('../src/models/transcriptChunk.model', () => ({
  find: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../src/services/embeddingClient.service', () => ({
  indexVideoEmbeddings: jest.fn(),
  searchVideoEmbeddings: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  getDurationMs: jest.fn(() => 10),
}));

jest.mock('../src/services/queryExpansion.service', () => ({
  expandQueryTerms: jest.fn(),
}));

jest.mock('../src/services/entityRetrieval.service', () => ({
  searchEntityAwareChunks: jest.fn(),
}));

jest.mock('../src/services/topicRetrieval.service', () => ({
  searchTopicAwareChunks: jest.fn(),
}));

const {
  __testables,
  searchVideoEmbeddingsWithAutoReindex,
} = require('../src/services/ragRetrieval.service');

const TranscriptChunk = require('../src/models/transcriptChunk.model');
const { searchVideoEmbeddings } = require('../src/services/embeddingClient.service');
const { expandQueryTerms } = require('../src/services/queryExpansion.service');
const { searchEntityAwareChunks } = require('../src/services/entityRetrieval.service');
const { searchTopicAwareChunks } = require('../src/services/topicRetrieval.service');

describe('ragRetrieval.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes keyword terms with phrases and split words', () => {
    const result = __testables.normalizeKeywordTerms(['Blue Spring', 'రూపీ వీక్']);

    expect(result).toEqual(
      expect.arrayContaining(['Blue Spring', 'Blue', 'Spring', 'రూపీ వీక్', 'రూపీ', 'వీక్'])
    );
  });

  test('calculates keyword score by matched terms ratio', () => {
    const score = __testables.calculateKeywordScore('RBI discussed rupee weakness', [
      'RBI',
      'rupee',
      'Tesla',
    ]);

    expect(score).toBeCloseTo(2 / 3);
  });

  test('entity match beats vector match for entity query', () => {
    const result = __testables.mergeRetrievalMatches({
      topK: 4,
      terms: ['blue', 'spring'],
      entityMatches: [
        {
          chunkIndex: 34,
          text: 'Blue Spring Enterprises got a large order',
          score: 0.95,
          entityScore: 0.95,
        },
      ],
      vectorMatches: [
        {
          chunkIndex: 5,
          text: 'unrelated gold discussion',
          score: 0.3,
        },
      ],
    });

    expect(result[0].chunkIndex).toBe(34);
    expect(result[0].retrievalSource).toBe('entity');
  });

  test('topic match beats unrelated vector match for topic query', () => {
    const result = __testables.mergeRetrievalMatches({
      topK: 4,
      terms: ['rupee', 'weakening'],
      topicMatches: [
        {
          chunkIndex: 24,
          text: 'rupee weakened because of Iran crisis and crude oil prices',
          score: 0.85,
          topicScore: 0.85,
        },
      ],
      vectorMatches: [
        {
          chunkIndex: 3,
          text: 'gold investment limit discussion',
          score: 0.25,
        },
      ],
    });

    expect(result[0].chunkIndex).toBe(24);
    expect(result[0].retrievalSource).toBe('topic');
  });

  test('same chunk from topic and keyword becomes topic_hybrid', () => {
    const result = __testables.mergeRetrievalMatches({
      topK: 4,
      terms: ['rupee'],
      topicMatches: [
        {
          chunkIndex: 24,
          text: 'rupee weakened due to crisis',
          score: 0.85,
          topicScore: 0.85,
        },
      ],
      keywordMatches: [
        {
          chunkIndex: 24,
          text: 'rupee weakened due to crisis',
          score: 0.5,
        },
      ],
    });

    expect(result[0].retrievalSource).toBe('topic_hybrid');
    expect(result[0].keywordRank).toBe(1);
  });

  test('search combines topic, entity, keyword, and vector retrieval', async () => {
    const video = {
      _id: { toString: () => 'video123' },
      videoId: 'yt123',
    };

    expandQueryTerms.mockResolvedValue(['rupee', 'weakening']);
    searchEntityAwareChunks.mockResolvedValue([]);
    searchTopicAwareChunks.mockResolvedValue([
      {
        chunkIndex: 24,
        text: 'rupee weakened due to Iran crisis',
        score: 0.85,
        topicScore: 0.85,
        retrievalSource: 'topic',
      },
    ]);

    searchVideoEmbeddings.mockResolvedValue({
      matches: [
        {
          chunkIndex: 5,
          text: 'gold investment discussion',
          score: 0.2,
        },
      ],
    });

    TranscriptChunk.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          chunkIndex: 24,
          text: 'rupee weakened due to Iran crisis',
        },
      ]),
    });

    const result = await searchVideoEmbeddingsWithAutoReindex({
      video,
      query: 'Why is rupee weakening?',
      topK: 4,
    });

    expect(result.retrievalMode).toBe('hybrid');
    expect(result.matches[0].chunkIndex).toBe(24);
  });
});
