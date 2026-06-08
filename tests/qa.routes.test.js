jest.mock('../src/models/video.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/user.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/transcriptChunk.model', () => ({
  countDocuments: jest.fn(),
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

const createMockVideo = (overrides = {}) => ({
  _id: videoId,
  user: userId,
  videoId: 'test-youtube-id',
  title: 'Test Video',
  summaryStatus: 'completed',
  summaryError: null,
  summary: {
    shortSummary: 'Short summary',
    detailedSummary: 'This video discusses governance, AI, and public trust.',
    mainTopics: ['Governance', 'AI'],
    keyTakeaways: ['Public trust matters'],
    people: [
      {
        name: 'Vijay',
        summary: 'Vijay talks about governance and unity.',
        talkedAbout: ['governance', 'unity'],
      },
    ],
    topics: [
      {
        name: 'AI',
        summary: 'AI discussion focuses on risks and regulation.',
        keyPoints: ['AI risks', 'AI regulation'],
      },
    ],
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
  ChatMessage.create.mockResolvedValue({ _id: 'chat123' });
};

describe('QA routes', () => {
  beforeEach(() => {
    const TranscriptChunk = require('../src/models/transcriptChunk.model');

    TranscriptChunk.countDocuments.mockResolvedValue(10);

    TranscriptChunk.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          chunkIndex: 0,
          text: 'sample transcript chunk',
        },
      ]),
    });

    jest.clearAllMocks();
    mockAuthenticatedUser();
  });

  it('rejects missing query', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

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
    Video.findOne.mockResolvedValue(createMockVideo());

    generateAnswer.mockResolvedValue('summary answer');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'what is this video about?' });

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('summary');
    expect(res.body.data.intent).toBe('VIDEO_OVERVIEW');
    expect(generateAnswer).toHaveBeenCalled();
  });

  it('handles QA query with embedding search', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

    searchVideoEmbeddings.mockResolvedValue({
      matches: [{ text: 'relevant chunk 1' }, { text: 'relevant chunk 2' }],
    });

    generateAnswer.mockResolvedValue('qa answer');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'what is discussed?', topK: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('qa');
    expect(res.body.data.intent).toBe('SPECIFIC_QA');
    expect(searchVideoEmbeddings).toHaveBeenCalled();
  });

  it('applies topK normalization', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

    searchVideoEmbeddings.mockResolvedValue({
      matches: [{ text: 'chunk' }],
    });

    generateAnswer.mockResolvedValue('answer');

    mockChatCreate();

    await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'test', topK: 100 });

    expect(searchVideoEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 6,
      })
    );
  });

  it('handles entity overview mode', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

    generateAnswer.mockResolvedValue('Vijay talks about governance and unity.');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'What is Vijay talking about in this video?',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('ENTITY_OVERVIEW');
    expect(res.body.data.mode).toBe('entity_overview');
    expect(res.body.data.entity).toBe('Vijay');
    expect(generateAnswer).toHaveBeenCalled();
  });

  it('handles topic overview mode', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

    generateAnswer.mockResolvedValue('The AI discussion focuses on risks and regulation.');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'AI gurinchi main points enti?',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('TOPIC_OVERVIEW');
    expect(res.body.data.mode).toBe('topic_overview');
    expect(res.body.data.topic).toBe('AI');
    expect(generateAnswer).toHaveBeenCalled();
  });

  it('handles timestamp query mode', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

    searchVideoEmbeddings.mockResolvedValue({
      matches: [
        {
          text: 'Tesla discussion starts here.',
          startTime: 320,
        },
      ],
    });

    generateAnswer.mockResolvedValue('They discuss Tesla around 5 minutes into the video.');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'When did they talk about Tesla?',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('TIMESTAMP_QUERY');
    expect(res.body.data.mode).toBe('timestamp_query');
    expect(searchVideoEmbeddings).toHaveBeenCalled();
  });

  it('handles action extraction mode', async () => {
    TranscriptChunk.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            chunkIndex: 0,
            text: 'Important discussion about governance.',
            startTime: 0,
          },
          {
            chunkIndex: 1,
            text: 'Discussion about AI and public trust.',
            startTime: 120,
          },
          {
            chunkIndex: 2,
            text: 'Important political analysis section.',
            startTime: 240,
          },
        ]),
      }),
    });

    Video.findOne.mockResolvedValue(createMockVideo());

    searchVideoEmbeddings.mockResolvedValue({
      matches: [
        {
          text: 'Actionable advice about productivity.',
        },
      ],
    });

    generateAnswer.mockResolvedValue('1. Focus deeply\n2. Avoid distractions');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Create notes from this video',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('ACTION_EXTRACTION');
    expect(res.body.data.mode).toBe('action_extraction');
    expect(res.body.data.actionType).toBe('GENERIC_NOTES');
    expect(searchVideoEmbeddings).not.toHaveBeenCalled();
    expect(res.body.data.supportingChunks).toHaveLength(3);
    expect(generateAnswer).toHaveBeenCalled();
  });

  it('fetches chat history for a video', async () => {
    Video.findOne.mockResolvedValue(createMockVideo());

    ChatMessage.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: 'chat1',
          question: 'What is this video about?',
          answer: 'summary answer',
        },
      ]),
    });

    const res = await request(app)
      .get(`/api/videos/${videoId}/chats`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.chats).toHaveLength(1);
  });

  it('handles detailed notes action type', async () => {
    TranscriptChunk.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            chunkIndex: 0,
            text: 'Beginning discussion about India thorium reserves.',
            startTime: 0,
          },
          {
            chunkIndex: 1,
            text: 'Middle discussion about three-stage nuclear program.',
            startTime: 120,
          },
          {
            chunkIndex: 2,
            text: 'Later discussion about PFBR and uranium-233.',
            startTime: 240,
          },
        ]),
      }),
    });

    Video.findOne.mockResolvedValue(createMockVideo());

    generateAnswer.mockResolvedValue('# Detailed Video Notes');

    mockChatCreate();

    const res = await request(app)
      .post(`/api/videos/${videoId}/ask`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Create detailed notes from this video',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('ACTION_EXTRACTION');
    expect(res.body.data.mode).toBe('action_extraction');
    expect(res.body.data.actionType).toBe('DETAILED_NOTES');
    expect(res.body.data.supportingChunks).toHaveLength(3);
    expect(searchVideoEmbeddings).not.toHaveBeenCalled();
    expect(generateAnswer).toHaveBeenCalled();
  });
});
