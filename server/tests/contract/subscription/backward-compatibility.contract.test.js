const {
  registeredOpenApiContracts,
  registeredSchemaContracts,
} = require('../../../src/contracts/openapi');

describe('Subscription backward compatibility contract regression', () => {
  it('keeps existing asset contracts registered alongside the additive 1.2.0 subscription contract', () => {
    expect(registeredOpenApiContracts.assetsMobileParity).toBeDefined();
    expect(registeredOpenApiContracts.subscriptionMvp).toBeDefined();
  });

  it('retains enhancement and realtime-related additive contract registrations', () => {
    expect(registeredOpenApiContracts.assetsImageEnhancement).toBeDefined();
    expect(registeredSchemaContracts.subscriptionEvents).toBeDefined();
  });
});
