const request = require('supertest');
const { app } = require('../../../src/app');

describe('Admin upgrade review contracts', () => {
  it('POST /api/admin/subscription/upgrade-requests/:id/approve requires authentication', async () => {
    const response = await request(app)
      .post('/api/admin/subscription/upgrade-requests/request-123/approve')
      .send({ reason: 'verified transfer' })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });

  it('POST /api/admin/subscription/upgrade-requests/:id/reject requires authentication', async () => {
    const response = await request(app)
      .post('/api/admin/subscription/upgrade-requests/request-123/reject')
      .send({ reason: 'invalid reference' })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });
});
