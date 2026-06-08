jest.mock('../src/models/transcriptChunk.model', () => ({
  find: jest.fn(),
}));

jest.mock('../src/services/llm.service', () => ({
  generateAnswer: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  getDurationMs: jest.fn(() => 10),
}));

const TranscriptChunk = require('../src/models/transcriptChunk.model');
const { generateAnswer } = require('../src/services/llm.service');
const { searchTopicAwareChunks } = require('../src/services/topicRetrieval.service');

const mockFindChain = (chunks) => ({
  sort: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(chunks),
});

const mockFindChunksByIndexes = (chunks) => ({
  lean: jest.fn().mockResolvedValue(chunks),
});

describe('topicRetrieval.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns topic chunks for why/reason question', async () => {
    const video = {
      _id: { toString: () => 'video1' },
      videoId: 'yt1',
    };

    TranscriptChunk.find
      .mockReturnValueOnce(
        mockFindChain([{ chunkIndex: 24, text: 'రూపీ వీక్ అవుతూ ఇరాన్ క్రైసిస్ కారణంగా' }])
      )
      .mockReturnValueOnce(
        mockFindChunksByIndexes([
          { chunkIndex: 23, text: 'previous context' },
          { chunkIndex: 24, text: 'రూపీ వీక్ అవుతూ ఇరాన్ క్రైసిస్ కారణంగా' },
          { chunkIndex: 25, text: 'next context' },
        ])
      );

    generateAnswer.mockResolvedValue(
      JSON.stringify({
        shouldUseTopicRetrieval: true,
        topic: 'rupee weakening reasons',
        terms: ['రూపీ వీక్', 'ఇరాన్ క్రైసిస్'],
        chunkIndexes: [24],
        confidence: 0.9,
      })
    );

    const result = await searchTopicAwareChunks({
      video,
      query: 'Why is rupee weakening?',
      limit: 4,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].retrievalSource).toBe('topic');
    expect(result[0].topic).toBe('rupee weakening reasons');
  });

  test('returns empty when topic confidence is low', async () => {
    const video = {
      _id: { toString: () => 'video1' },
      videoId: 'yt1',
    };

    TranscriptChunk.find.mockReturnValueOnce(mockFindChain([]));

    generateAnswer.mockResolvedValue(
      JSON.stringify({
        shouldUseTopicRetrieval: true,
        topic: 'unclear',
        terms: [],
        chunkIndexes: [],
        confidence: 0.3,
      })
    );

    const result = await searchTopicAwareChunks({
      video,
      query: 'random question',
      limit: 4,
    });

    expect(result).toEqual([]);
  });
});
