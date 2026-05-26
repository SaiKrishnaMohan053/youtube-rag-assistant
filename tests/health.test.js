const request = require('supertest');
const app = require('../src/app');

describe('Health route', () => {
  it('GET /api/health/live should return healthy response', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('timestamp');
  });
});
