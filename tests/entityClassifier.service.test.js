jest.mock('../src/services/llm.service', () => ({
  generateAnswer: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  getDurationMs: jest.fn(() => 10),
}));

const { generateAnswer } = require('../src/services/llm.service');
const { classifyEntityQuery } = require('../src/services/entityClassifier.service');

describe('entityClassifier.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('classifies company entity query', async () => {
    generateAnswer.mockResolvedValue(
      JSON.stringify({
        isEntityQuery: true,
        entity: 'Blue Spring',
        confidence: 0.95,
        reason: 'Specific company',
      })
    );

    const result = await classifyEntityQuery({
      video: { _id: 'video1', videoId: 'yt1' },
      query: 'Tell me about Blue Spring',
    });

    expect(result.isEntityQuery).toBe(true);
    expect(result.entity).toBe('Blue Spring');
  });

  test('does not classify topic query as entity', async () => {
    generateAnswer.mockResolvedValue(
      JSON.stringify({
        isEntityQuery: false,
        entity: null,
        confidence: 0.9,
        reason: 'Topic',
      })
    );

    const result = await classifyEntityQuery({
      video: { _id: 'video1', videoId: 'yt1' },
      query: 'Why is rupee weakening?',
    });

    expect(result.isEntityQuery).toBe(false);
    expect(result.entity).toBe(null);
  });

  test('low confidence entity becomes false', async () => {
    generateAnswer.mockResolvedValue(
      JSON.stringify({
        isEntityQuery: true,
        entity: 'Something',
        confidence: 0.4,
        reason: 'uncertain',
      })
    );

    const result = await classifyEntityQuery({
      video: { _id: 'video1', videoId: 'yt1' },
      query: 'Tell me about something',
    });

    expect(result.isEntityQuery).toBe(false);
    expect(result.entity).toBe(null);
  });
});
