const request = require('supertest');
const { app } = require('../../../src/app');
const { registeredOpenApiContracts } = require('../../../src/contracts/openapi');

describe('GET /api/subscription/me contract', () => {
  it('is registered in the additive 1.2.0 subscription contract', () => {
    const contract = registeredOpenApiContracts.subscriptionMvp;

    expect(contract).toBeDefined();
    expect(contract.info.version).toBe('1.2.0');
    expect(contract.paths['/api/subscription/me']).toBeDefined();
  });

  it('requires authentication and returns UNAUTHORIZED when token is missing', async () => {
    const response = await request(app)
      .get('/api/subscription/me')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });
});
