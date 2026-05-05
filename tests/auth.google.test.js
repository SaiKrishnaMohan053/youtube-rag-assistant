process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('../src/models/user.model', () => {
  const MockUser = function MockUser(data) {
    return {
      ...data,
      _id: '507f1f77bcf86cd799439011',
      role: data.role || 'user',
      save: jest.fn().mockResolvedValue(true),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  MockUser.findOne = jest.fn();
  MockUser.create = jest.fn();

  return MockUser;
});

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('google auth route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing Google credential', async () => {
    const res = await request(app).post('/api/auth/google').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates a new Google user and returns JWT', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'google@example.com',
        name: 'Google User',
      }),
    });

    User.findOne.mockResolvedValue(null);

    User.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Google User',
      email: 'google@example.com',
      role: 'user',
      authProvider: 'google',
      googleId: 'google-user-123',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post('/api/auth/google').send({
      credential: 'valid-google-token',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('google@example.com');
    expect(res.body.data.user.authProvider).toBe('google');
    expect(res.body.data.user.isEmailVerified).toBe(true);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'google@example.com',
        authProvider: 'google',
        googleId: 'google-user-123',
        isEmailVerified: true,
      })
    );
  });

  it('logs in existing Google user and returns JWT', async () => {
    const save = jest.fn().mockResolvedValue(true);

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'existing@example.com',
        name: 'Existing User',
      }),
    });

    User.findOne.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Existing User',
      email: 'existing@example.com',
      role: 'user',
      authProvider: 'google',
      googleId: 'google-user-123',
      isEmailVerified: true,
      save,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post('/api/auth/google').send({
      credential: 'valid-google-token',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('existing@example.com');
    expect(save).toHaveBeenCalled();
  });
});