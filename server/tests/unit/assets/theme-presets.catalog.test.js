const {
  ASSET_THEME_FALLBACK_ID,
  assertValidAssetThemePresetId,
  resolveAssetThemeId,
} = require('../../../src/modules/assets/theme-presets.catalog');

describe('Asset theme preset catalog', () => {
  it('accepts valid active preset ids', () => {
    expect(assertValidAssetThemePresetId('vault-graphite')).toBe('vault-graphite');
    expect(assertValidAssetThemePresetId(null)).toBeNull();
  });

  it('rejects unknown preset ids', () => {
    expect(() => assertValidAssetThemePresetId('missing-theme')).toThrow(
      'Unknown asset theme preset: missing-theme'
    );
  });

  it('resolves asset override, then user default, then fallback', () => {
    expect(resolveAssetThemeId('museum-forest', 'archive-cobalt')).toBe('museum-forest');
    expect(resolveAssetThemeId(null, 'archive-cobalt')).toBe('archive-cobalt');
    expect(resolveAssetThemeId(null, null)).toBe(ASSET_THEME_FALLBACK_ID);
  });
});
