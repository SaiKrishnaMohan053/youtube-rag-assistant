jest.mock('../src/models/transcriptChunk.model', () => ({
  find: jest.fn(),
}));

jest.mock('../src/services/llm.service', () => ({
  generateAnswer: jest.fn(),
}));

jest.mock('../src/services/entityClassifier.service', () => ({
  classifyEntityQuery: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  getDurationMs: jest.fn(() => 10),
}));

const TranscriptChunk = require('../src/models/transcriptChunk.model');
const { generateAnswer } = require('../src/services/llm.service');
const { classifyEntityQuery } = require('../src/services/entityClassifier.service');
const { searchEntityAwareChunks } = require('../src/services/entityRetrieval.service');

const mockFindScanChain = (chunks) => ({
  sort: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(chunks),
});

const mockFindMatchChain = (chunks) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(chunks),
});

describe('entityRetrieval.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns entity chunks when classifier and entity lookup succeed', async () => {
    const video = {
      _id: { toString: () => 'video1' },
      videoId: 'yt1',
    };

    classifyEntityQuery.mockResolvedValue({
      isEntityQuery: true,
      entity: 'Blue Spring',
      confidence: 0.95,
      reason: 'specific company',
    });

    TranscriptChunk.find
      .mockReturnValueOnce(
        mockFindScanChain([
          { chunkIndex: 34, text: 'బ్లూ స్ప్రింగ్ ఎంటర్ప్రైజెస్ గురించి మాట్లాడుకోవాలి' },
          { chunkIndex: 35, text: 'Blue Spring stock rose after big order' },
        ])
      )
      .mockReturnValueOnce(
        mockFindMatchChain([
          { chunkIndex: 34, text: 'బ్లూ స్ప్రింగ్ ఎంటర్ప్రైజెస్ గురించి మాట్లాడుకోవాలి' },
          { chunkIndex: 35, text: 'Blue Spring stock rose after big order' },
        ])
      );

    generateAnswer.mockResolvedValue(
      JSON.stringify({
        terms: ['బ్లూ స్ప్రింగ్', 'Blue Spring', 'Blue Spring Enterprises'],
        chunkIndexes: [34, 35],
      })
    );

    const result = await searchEntityAwareChunks({
      video,
      query: 'Tell me about Blue Spring',
      limit: 4,
    });

    expect(result).toHaveLength(2);
    expect(result[0].retrievalSource).toBe('entity');
    expect(result[0].entityScore).toBe(0.95);
    expect(result[0].entityTerms).toEqual(
      expect.arrayContaining(['బ్లూ స్ప్రింగ్', 'Blue Spring'])
    );
  });

  test('returns empty when classifier says query is not entity query', async () => {
    const video = {
      _id: { toString: () => 'video1' },
      videoId: 'yt1',
    };

    classifyEntityQuery.mockResolvedValue({
      isEntityQuery: false,
      entity: null,
      confidence: 0.9,
      reason: 'topic query',
    });

    const result = await searchEntityAwareChunks({
      video,
      query: 'Why is rupee weakening?',
      limit: 4,
    });

    expect(result).toEqual([]);
    expect(generateAnswer).not.toHaveBeenCalled();
  });

  test('returns empty when entity lookup returns no terms and no indexes', async () => {
    const video = {
      _id: { toString: () => 'video1' },
      videoId: 'yt1',
    };

    classifyEntityQuery.mockResolvedValue({
      isEntityQuery: true,
      entity: 'Tesla',
      confidence: 0.95,
      reason: 'specific company',
    });

    TranscriptChunk.find.mockReturnValueOnce(
      mockFindScanChain([{ chunkIndex: 1, text: 'Rupee and RBI discussion only' }])
    );

    generateAnswer.mockResolvedValue(
      JSON.stringify({
        terms: [],
        chunkIndexes: [],
      })
    );

    const result = await searchEntityAwareChunks({
      video,
      query: 'What did he say about Tesla?',
      limit: 4,
    });

    expect(result).toEqual([]);
  });

  test('handles invalid entity lookup JSON safely', async () => {
    const video = {
      _id: { toString: () => 'video1' },
      videoId: 'yt1',
    };

    classifyEntityQuery.mockResolvedValue({
      isEntityQuery: true,
      entity: 'ICICI',
      confidence: 0.95,
      reason: 'specific organization',
    });

    TranscriptChunk.find.mockReturnValueOnce(
      mockFindScanChain([{ chunkIndex: 5, text: 'ICICI ETF limits discussed' }])
    );

    generateAnswer.mockResolvedValue('not json');

    const result = await searchEntityAwareChunks({
      video,
      query: 'What did he say about ICICI?',
      limit: 4,
    });

    expect(result).toEqual([]);
  });
});
