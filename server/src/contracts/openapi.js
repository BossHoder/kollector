const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');

function tryReadJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

const contractPaths = Object.freeze({
  assetsMobileParity: 'specs/011-mobile-ux-parity/contracts/assets.mobile-parity.openapi.json',
  gamification: 'specs/013-gamification-core/contracts/gamification.openapi.json',
  assetsImageEnhancement:
    'specs/014-manual-enhancement-themes/contracts/assets-image-enhancement.openapi.json',
  authAssetTheme:
    'specs/014-manual-enhancement-themes/contracts/auth-asset-theme.openapi.json',
});

const registeredEntries = Object.entries(contractPaths).flatMap(([key, relativePath]) => {
  const contract = tryReadJson(relativePath);
  return contract ? [[key, contract]] : [];
});

const registeredOpenApiContracts = Object.freeze(
  Object.fromEntries(registeredEntries)
);

const registeredOpenApiContractMetadata = Object.freeze(
  Object.fromEntries(
    registeredEntries.map(([key, contract]) => [
      key,
      {
        version: contract?.info?.version || null,
        policy: contract?.info?.['x-contract-evolution']?.policy || null,
        compatibility: contract?.info?.['x-contract-evolution']?.compatibility || null,
        previousVersion: contract?.info?.['x-contract-evolution']?.previousVersion || null,
      },
    ])
  )
);

module.exports = {
  registeredOpenApiContractMetadata,
  registeredOpenApiContracts,
};
