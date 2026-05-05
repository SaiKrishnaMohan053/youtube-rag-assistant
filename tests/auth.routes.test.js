jest.mock('../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/user.model', () => {
  const MockUser = function MockUser(data) {
    return {
      ...data,
      _id: '507f1f77bcf86cd799439011',
      role: data.role || 'user',
      isEmailVerified: data.isEmailVerified ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      createEmailVerificationToken: jest.fn().mockReturnValue('raw-token'),
      comparePassword: jest.fn(),
    };
  };

  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.create = jest.fn();

  return MockUser;
});

const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/user.model');
const env = require('../src/config/env');

describe('auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('register does not return password or token', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'test@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.isEmailVerified).toBe(false);
  });

  it('login validates invalid credentials', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@y.com', password: 'bad' });

    expect(res.status).toBe(401);
  });

  it('blocks login when email is not verified', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'user',
        authProvider: 'local',
        isEmailVerified: false,
        comparePassword: jest.fn().mockResolvedValue(true),
      }),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' });

    expect(res.status).toBe(403);
  });

  it('logs in verified local user', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Test',
        email: 'test@example.com',
        role: 'user',
        authProvider: 'local',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        comparePassword: jest.fn().mockResolvedValue(true),
      }),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('verifies email with valid token', async () => {
    const rawToken = 'valid-token';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const save = jest.fn().mockResolvedValue(true);

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        emailVerificationToken: hashedToken,
        emailVerificationExpires: new Date(Date.now() + 10000),
        isEmailVerified: false,
        save,
      }),
    });

    const res = await request(app).get(`/api/auth/verify-email?token=${rawToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verified successfully');
    expect(save).toHaveBeenCalled();
  });

  it('rejects invalid verification token', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).get('/api/auth/verify-email?token=bad-token');

    expect(res.status).toBe(400);
  });

  it('me returns authenticated user without password', async () => {
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, env.jwtSecret);

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Tester',
        email: 'tester@example.com',
      }),
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.password).toBeUndefined();
  });
});