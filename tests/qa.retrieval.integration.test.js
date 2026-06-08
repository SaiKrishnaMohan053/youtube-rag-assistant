jest.mock('../src/models/video.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/user.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/chatMessage.model', () => ({
  create: jest.fn(),
}));

jest.mock('../src/services/ragRetrieval.service', () => ({
  searchVideoEmbeddingsWithAutoReindex: jest.fn(),
}));

jest.mock('../src/services/llm.service', () => ({
  generateAnswer: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logMetric: jest.fn(),
  getDurationMs: jest.fn(() => 10),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');

const Video = require('../src/models/video.model');
const ChatMessage = require('../src/models/chatMessage.model');
const { searchVideoEmbeddingsWithAutoReindex } = require('../src/services/ragRetrieval.service');
const { generateAnswer } = require('../src/services/llm.service');

const userId = '507f1f77bcf86cd799439011';
const videoMongoId = '507f1f77bcf86cd799439012';

const token = jwt.sign({ id: userId, role: 'user' }, env.jwtSecret);

const createMockVideo = (overrides = {}) => ({
  _id: {
    toString: () => videoMongoId,
  },
  user: {
    toString: () => userId,
  },
  videoId: 'test-youtube-id',
  title: 'Test Video',
  summaryStatus: 'completed',
  summaryError: null,
  summary: {
    shortSummary: 'Short summary',
    detailedSummary: 'Detailed summary',
    mainTopics: ['Markets'],
    keyTakeaways: ['Important takeaway'],
    people: [],
    topics: [],
  },
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const mockAuthenticatedUser = () => {
  const User = require('../src/models/user.model');

  User.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: userId,
      name: 'Tester',
      email: 'tester@example.com',
      role: 'user',
    }),
  });
};

const mockChatCreate = () => {
  ChatMessage.create.mockResolvedValue({
    _id: 'chat123',
  });
};

describe('QA retrieval integration routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedUser();
    mockChatCreate();
    Video.findOne.mockResolvedValue(createMockVideo());
  });

  test('returns entity retrieval chunks for entity query', async () => {
    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [
        {
          chunkIndex: 34,
          text: 'Blue Spring Enterprises received a big order.',
          startTime: 1184,
          endTime: 1226,
          score: 0.95,
          entityScore: 0.95,
          retrievalSource: 'entity',
          entityRank: 1,
          entityTerms: ['Blue Spring', 'Blue Spring Enterprises'],
        },
      ],
    });

    generateAnswer.mockResolvedValue('Blue Spring received a big order from BALCO.');

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Tell me about Blue Spring',
        topK: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('qa');
    expect(res.body.data.intent).toBe('SPECIFIC_QA');
    expect(res.body.data.supportingChunks).toHaveLength(1);
    expect(res.body.data.supportingChunks[0].retrievalSource).toBe('entity');
    expect(res.body.data.supportingChunks[0].entityScore).toBe(0.95);
    expect(generateAnswer).toHaveBeenCalled();
    expect(ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Tell me about Blue Spring',
        answer: 'Blue Spring received a big order from BALCO.',
      })
    );
  });

  test('returns topic retrieval chunks for topic query', async () => {
    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [
        {
          chunkIndex: 24,
          text: 'Rupee weakened due to Iran crisis, crude oil, and supply chain issues.',
          startTime: 851,
          endTime: 887,
          score: 0.85,
          topicScore: 0.85,
          retrievalSource: 'topic',
          topicRank: 1,
          topic: 'rupee weakening reasons',
          topicTerms: ['rupee weakening', 'Iran crisis', 'crude oil'],
        },
      ],
    });

    generateAnswer.mockResolvedValue(
      'The rupee weakened because of Iran crisis, crude oil, and supply chain issues.'
    );

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Why is rupee weakening?',
        topK: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('qa');
    expect(res.body.data.intent).toBe('SPECIFIC_QA');
    expect(res.body.data.supportingChunks).toHaveLength(1);
    expect(res.body.data.supportingChunks[0].retrievalSource).toBe('topic');
    expect(res.body.data.supportingChunks[0].topicScore).toBe(0.85);
    expect(res.body.data.answer).toContain('rupee');
  });

  test('preserves entity-ranked chunk order when entity result beats vector result', async () => {
    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [
        {
          chunkIndex: 34,
          text: 'Entity result about ICICI.',
          score: 0.95,
          entityScore: 0.95,
          retrievalSource: 'entity',
          entityRank: 1,
        },
        {
          chunkIndex: 2,
          text: 'Lower relevance vector result.',
          score: 0.4,
          retrievalSource: 'vector',
          vectorRank: 1,
        },
      ],
    });

    generateAnswer.mockResolvedValue('ICICI imposed investment limits.');

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What did he say about ICICI?',
        topK: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.supportingChunks[0].retrievalSource).toBe('entity');
    expect(res.body.data.supportingChunks[0].entityScore).toBe(0.95);
  });

  test('preserves topic-ranked chunk order when topic result beats vector result', async () => {
    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [
        {
          chunkIndex: 24,
          text: 'Topic result about rupee weakness.',
          score: 0.85,
          topicScore: 0.85,
          retrievalSource: 'topic',
          topicRank: 1,
        },
        {
          chunkIndex: 35,
          text: 'Lower relevance vector result.',
          score: 0.2,
          retrievalSource: 'vector',
          vectorRank: 1,
        },
      ],
    });

    generateAnswer.mockResolvedValue('Rupee weakened due to geopolitical issues.');

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Why is rupee weakening?',
        topK: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.supportingChunks[0].retrievalSource).toBe('topic');
    expect(res.body.data.supportingChunks[0].topicScore).toBe(0.85);
  });

  test('returns 500 when LLM generation fails', async () => {
    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [
        {
          chunkIndex: 1,
          text: 'Relevant transcript chunk.',
          score: 0.8,
          retrievalSource: 'vector',
          vectorRank: 1,
        },
      ],
    });

    generateAnswer.mockRejectedValue(new Error('OpenAI failure'));

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What is discussed?',
        topK: 4,
      });

    expect(res.status).toBe(500);
    expect(ChatMessage.create).not.toHaveBeenCalled();
  });
});
