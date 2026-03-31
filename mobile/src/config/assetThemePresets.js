export const ASSET_THEME_FALLBACK_ID = 'vault-graphite';

export const ASSET_THEME_PRESETS = Object.freeze([
  {
    id: 'vault-graphite',
    name: 'Vault Graphite',
    active: true,
    tokenSet: {
      surface: '#111817',
      surfaceElevated: '#1c2725',
      text: '#f3f1ea',
      accent: '#d5a24e',
    },
  },
  {
    id: 'ledger-ivory',
    name: 'Ledger Ivory',
    active: true,
    tokenSet: {
      surface: '#f4efe4',
      surfaceElevated: '#ffffff',
      text: '#251d14',
      accent: '#c06b2d',
    },
  },
  {
    id: 'museum-forest',
    name: 'Museum Forest',
    active: true,
    tokenSet: {
      surface: '#15211b',
      surfaceElevated: '#223229',
      text: '#eff4ee',
      accent: '#8fb56a',
    },
  },
  {
    id: 'archive-cobalt',
    name: 'Archive Cobalt',
    active: true,
    tokenSet: {
      surface: '#101a2f',
      surfaceElevated: '#1d2a4b',
      text: '#edf2ff',
      accent: '#7aa8ff',
    },
  },
]);

export function getAssetThemePresetById(themeId) {
  return ASSET_THEME_PRESETS.find((preset) => preset.id === themeId) || null;
}

export function resolveAssetThemeId(themeOverrideId, defaultThemeId) {
  return themeOverrideId || defaultThemeId || ASSET_THEME_FALLBACK_ID;
}
