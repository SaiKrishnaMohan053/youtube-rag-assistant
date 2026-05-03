const request = require('supertest');
const app = require('../src/app');

describe('Not found middleware', () => {
  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
