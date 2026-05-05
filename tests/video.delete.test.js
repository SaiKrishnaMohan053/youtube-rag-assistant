jest.mock('../src/models/user.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/video.model', () => ({
  findOne: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock('../src/models/transcriptChunk.model', () => ({
  deleteMany: jest.fn(),
}));

jest.mock('../src/models/chatMessage.model', () => ({
  deleteMany: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const User = require('../src/models/user.model');
const Video = require('../src/models/video.model');
const TranscriptChunk = require('../src/models/transcriptChunk.model');
const ChatMessage = require('../src/models/chatMessage.model');

const userId = '507f1f77bcf86cd799439011';
const videoMongoId = '507f1f77bcf86cd799439012';

const createToken = () => jwt.sign({ id: userId, role: 'user' }, env.jwtSecret);

describe('DELETE /api/videos/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: userId,
        name: 'Tester',
        email: 'tester@example.com',
        role: 'user',
      }),
    });
  });

  it('rejects unauthenticated delete request', async () => {
    const res = await request(app).delete(`/api/videos/${videoMongoId}`);

    expect(res.status).toBe(401);
  });

  it('returns 404 when video is missing or not owned by user', async () => {
    Video.findOne.mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/videos/${videoMongoId}`)
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(404);
    expect(Video.deleteOne).not.toHaveBeenCalled();
    expect(TranscriptChunk.deleteMany).not.toHaveBeenCalled();
    expect(ChatMessage.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes owned video, transcript chunks, and chat messages', async () => {
    Video.findOne.mockResolvedValue({
      _id: videoMongoId,
      user: userId,
      videoId: 'youtube123',
    });

    TranscriptChunk.deleteMany.mockResolvedValue({ deletedCount: 3 });
    ChatMessage.deleteMany.mockResolvedValue({ deletedCount: 2 });
    Video.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const res = await request(app)
      .delete(`/api/videos/${videoMongoId}`)
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Video deleted successfully');

    expect(TranscriptChunk.deleteMany).toHaveBeenCalledWith({
      video: videoMongoId,
      user: userId,
    });

    expect(ChatMessage.deleteMany).toHaveBeenCalledWith({
      video: videoMongoId,
      user: userId,
    });

    expect(Video.deleteOne).toHaveBeenCalledWith({
      _id: videoMongoId,
      user: userId,
    });
  });
});
