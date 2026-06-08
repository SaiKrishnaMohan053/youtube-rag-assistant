jest.mock('../src/models/transcriptChunk.model', () => ({
  countDocuments: jest.fn(),
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
const { expandQueryTerms, getBasicQueryTerms } = require('../src/services/queryExpansion.service');

const mockFindChain = (chunks) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(chunks),
});

describe('queryExpansion.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getBasicQueryTerms extracts clean terms', () => {
    expect(getBasicQueryTerms('Why is rupee weakening?')).toEqual(['why', 'rupee', 'weakening']);
  });

  test('expandQueryTerms removes stop words and keeps useful terms', async () => {
    const video = { _id: 'video1', videoId: 'yt1', summary: {} };

    TranscriptChunk.countDocuments.mockResolvedValue(3);
    TranscriptChunk.find.mockReturnValue(
      mockFindChain([{ chunkIndex: 0, text: 'RBI rupee update' }])
    );

    generateAnswer.mockResolvedValue(JSON.stringify(['what', 'RBI', 'రూపీ', 'gold investment']));

    const result = await expandQueryTerms({ video, query: 'What did RBI say?' });

    expect(result).toEqual(expect.arrayContaining(['RBI', 'రూపీ', 'gold investment']));
    expect(result).not.toContain('what');
  });

  test('uses fallback terms when LLM returns invalid JSON', async () => {
    const video = { _id: 'video1', videoId: 'yt1', summary: {} };

    TranscriptChunk.countDocuments.mockResolvedValue(0);
    TranscriptChunk.find.mockReturnValue(mockFindChain([]));

    generateAnswer.mockResolvedValue('not json');

    const result = await expandQueryTerms({ video, query: 'Tell me about ICICI' });

    expect(result).toEqual(expect.arrayContaining(['icici']));
  });
});
