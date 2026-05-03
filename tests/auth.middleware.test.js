const request = require('supertest');
const express = require('express');
const { protect } = require('../src/middleware/auth.middleware');

const app = express();
app.get('/protected', protect, (_req, res) => res.json({ ok: true }));
app.use((err, _req, res, _next) =>
  res.status(err.statusCode || 500).json({ success: false, message: err.message })
);

describe('auth middleware', () => {
  it('rejects missing token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects malformed token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bad token');
    expect(res.status).toBe(401);
  });
});
