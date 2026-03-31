const {
  registeredOpenApiContracts,
  registeredOpenApiContractMetadata,
} = require('../../src/contracts/openapi');

describe('OpenAPI contract semver registration', () => {
  it('registers additive 1.1.0 contracts for enhancement and asset theme updates', () => {
    expect(registeredOpenApiContracts.assetsImageEnhancement).toBeDefined();
    expect(registeredOpenApiContracts.authAssetTheme).toBeDefined();

    expect(registeredOpenApiContracts.assetsImageEnhancement.info.version).toBe('1.1.0');
    expect(registeredOpenApiContracts.authAssetTheme.info.version).toBe('1.1.0');
  });

  it('keeps additive compatibility metadata for 1.1.0 contracts', () => {
    expect(registeredOpenApiContractMetadata.assetsImageEnhancement).toEqual(
      expect.objectContaining({
        version: '1.1.0',
        previousVersion: '1.0.0',
        compatibility: 'backward-compatible',
        policy: 'semver-minor-additive',
      })
    );

    expect(registeredOpenApiContractMetadata.authAssetTheme).toEqual(
      expect.objectContaining({
        version: '1.1.0',
        previousVersion: '1.0.0',
        compatibility: 'backward-compatible',
        policy: 'semver-minor-additive',
      })
    );
  });

  it('preserves legacy contract registrations while adding new ones', () => {
    expect(registeredOpenApiContracts.assetsMobileParity).toBeDefined();
    expect(registeredOpenApiContracts.gamification).toBeDefined();
  });

  it('keeps new asset fields additive and optional', () => {
    const assetRead =
      registeredOpenApiContracts.assetsImageEnhancement.components.schemas.AssetRead;
    const assetPatch =
      registeredOpenApiContracts.assetsImageEnhancement.components.schemas.AssetPatchRequest;
    const authPatch =
      registeredOpenApiContracts.authAssetTheme.components.schemas.AuthMePatchRequest;

    expect(assetRead.required).toEqual(expect.arrayContaining(['id', 'images']));
    expect(assetRead.required).not.toEqual(expect.arrayContaining(['presentation', 'enhancement']));
    expect(assetPatch.properties.presentation.properties.themeOverrideId.type).toEqual(
      expect.arrayContaining(['string', 'null'])
    );
    expect(
      authPatch.properties.settings.properties.preferences.properties.assetTheme.properties.defaultThemeId.type
    ).toEqual(expect.arrayContaining(['string', 'null']));
  });
});
