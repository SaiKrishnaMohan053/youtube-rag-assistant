jest.mock('../src/models/user.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

describe('auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('register does not return password', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Test',
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'test@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('login validates invalid credentials', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@y.com', password: 'bad' });
    expect(res.status).toBe(401);
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
