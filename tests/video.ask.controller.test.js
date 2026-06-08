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
  videoId: 'youtube-video-id',
  title: 'Test Video',
  summaryStatus: 'completed',
  summaryError: null,
  summary: {
    shortSummary: 'This is a short summary.',
    detailedSummary: 'This is a detailed summary.',
    mainTopics: ['Topic 1'],
    keyTakeaways: ['Takeaway 1'],
    people: [],
    topics: [],
  },
  ...overrides,
});

const mockAuthenticatedUser = () => {
  const User = require('../src/models/user.model');

  User.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: userId,
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    }),
  });
};

describe('video ask controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthenticatedUser();

    Video.findOne.mockResolvedValue(createMockVideo());

    ChatMessage.create.mockResolvedValue({
      _id: 'chat-message-id',
    });

    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [
        {
          chunkIndex: 1,
          text: 'Relevant transcript chunk.',
          startTime: 10,
          endTime: 30,
          score: 0.8,
          retrievalSource: 'vector',
          vectorRank: 1,
        },
      ],
    });

    generateAnswer.mockResolvedValue('This is the generated answer.');
  });

  test('returns 400 for invalid video id', async () => {
    const res = await request(app)
      .post('/api/videos/invalid-id/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What is this about?',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid video id');
  });

  test('returns 404 when video is not found', async () => {
    Video.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What is this about?',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Video not found');
  });

  test('returns 400 when query is missing', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Query is required');
  });

  test('returns 200 for successful specific QA answer', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What did he say?',
        topK: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBe('This is the generated answer.');
    expect(res.body.data.mode).toBe('qa');
    expect(res.body.data.intent).toBe('SPECIFIC_QA');
    expect(res.body.data.supportingChunks).toHaveLength(1);

    expect(searchVideoEmbeddingsWithAutoReindex).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'What did he say?',
        topK: 4,
      })
    );

    expect(ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'What did he say?',
        answer: 'This is the generated answer.',
      })
    );
  });

  test('returns graceful answer when retrieval returns no chunks', async () => {
    searchVideoEmbeddingsWithAutoReindex.mockResolvedValue({
      retrievalMode: 'hybrid',
      matches: [],
    });

    const res = await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Unknown question?',
        topK: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBe("I don't know based on this video transcript.");
    expect(res.body.data.supportingChunks).toEqual([]);
    expect(generateAnswer).not.toHaveBeenCalled();
  });

  test('clamps topK larger than max to 6', async () => {
    await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What did he explain?',
        topK: 100,
      });

    expect(searchVideoEmbeddingsWithAutoReindex).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 6,
      })
    );
  });

  test('clamps topK smaller than min to 3', async () => {
    await request(app)
      .post(`/api/videos/${videoMongoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What did he explain?',
        topK: 1,
      });

    expect(searchVideoEmbeddingsWithAutoReindex).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 3,
      })
    );
  });
});
