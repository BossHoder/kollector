const request = require('supertest');
const { app } = require('../../../src/app');

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Yd7wAAAAASUVORK5CYII=',
  'base64'
);

describe('Subscription upgrade request contracts', () => {
  it('POST /api/subscription/upgrade-requests requires authentication', async () => {
    const response = await request(app)
      .post('/api/subscription/upgrade-requests')
      .attach('proofFile', tinyPng, {
        filename: 'proof.png',
        contentType: 'image/png',
      })
      .field('type', 'upgrade')
      .field('transferReference', 'BANK-REF-001')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });

  it('GET /api/subscription/upgrade-requests requires authentication', async () => {
    const response = await request(app)
      .get('/api/subscription/upgrade-requests')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });
});
