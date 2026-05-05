jest.mock('../src/models/video.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/user.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/transcriptChunk.model', () => ({
  find: jest.fn(),
}));

jest.mock('../src/models/chatMessage.model', () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../src/services/embeddingClient.service', () => ({
  searchVideoEmbeddings: jest.fn(),
}));

jest.mock('../src/services/llm.service', () => ({
  generateAnswer: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');

const Video = require('../src/models/video.model');
const TranscriptChunk = require('../src/models/transcriptChunk.model');
const ChatMessage = require('../src/models/chatMessage.model');
const { searchVideoEmbeddings } = require('../src/services/embeddingClient.service');
const { generateAnswer } = require('../src/services/llm.service');

const userId = '507f1f77bcf86cd799439011';
const videoId = '507f1f77bcf86cd799439012';

const token = jwt.sign({ id: userId, role: 'user' }, env.jwtSecret);

describe('QA routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const User = require('../src/models/user.model');

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Tester',
        email: 'tester@example.com',
        role: 'user',
      }),
    });
  });

  it('rejects missing query', async () => {
    Video.findOne.mockResolvedValue({ _id: videoId, user: userId });

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects invalid video id', async () => {
    const res = await request(app)
      .post('/api/videos/invalid-id/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'test' });

    expect(res.status).toBe(400);
  });

  it('rejects video not owned', async () => {
    Video.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'test' });

    expect(res.status).toBe(404);
  });

  it('handles summary query mode', async () => {
    Video.findOne.mockResolvedValue({ _id: videoId, user: userId });

    TranscriptChunk.find.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            { text: 'intro content' },
            { text: 'main topic explained' },
            { text: 'important details' },
          ]),
      }),
    });

    generateAnswer.mockResolvedValue('summary answer');

    ChatMessage.create.mockResolvedValue({ _id: 'chat123' });

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'what is this video about?' });

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('summary');
    expect(generateAnswer).toHaveBeenCalled();
  });

  it('handles QA query with embedding search', async () => {
    Video.findOne.mockResolvedValue({ _id: videoId, user: userId });

    searchVideoEmbeddings.mockResolvedValue({
      matches: [{ text: 'relevant chunk 1' }, { text: 'relevant chunk 2' }],
    });

    generateAnswer.mockResolvedValue('qa answer');

    ChatMessage.create.mockResolvedValue({ _id: 'chat123' });

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'what is discussed?', topK: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('qa');
    expect(searchVideoEmbeddings).toHaveBeenCalled();
  });

  it('applies topK normalization', async () => {
    Video.findOne.mockResolvedValue({ _id: videoId, user: userId });

    searchVideoEmbeddings.mockResolvedValue({
      matches: [{ text: 'chunk' }],
    });

    generateAnswer.mockResolvedValue('answer');

    ChatMessage.create.mockResolvedValue({ _id: 'chat123' });

    await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'test', topK: 100 });

    expect(searchVideoEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 8, // clamped max
      })
    );
  });

  it('returns 404 when no chunks found', async () => {
    Video.findOne.mockResolvedValue({ _id: videoId, user: userId });

    searchVideoEmbeddings.mockResolvedValue({
      matches: [],
    });

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'test' });

    expect(res.status).toBe(404);
  });
});
