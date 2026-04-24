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

const openApiContractPaths = Object.freeze({
  assetsMobileParity: 'specs/004-mobile-ux-parity/contracts/assets.mobile-parity.openapi.json',
  gamification: 'specs/006-gamification-core/contracts/gamification.openapi.json',
  assetsImageEnhancement:
    'specs/007-manual-enhancement-themes/contracts/assets-image-enhancement.openapi.json',
  authAssetTheme:
    'specs/007-manual-enhancement-themes/contracts/auth-asset-theme.openapi.json',
  subscriptionMvp:
    'specs/008-subscription-mvp-banking/contracts/subscription-mvp.openapi.json',
});

const schemaContractPaths = Object.freeze({
  subscriptionEvents:
    'specs/008-subscription-mvp-banking/contracts/subscription-events.schema.json',
});

const registeredEntries = Object.entries(openApiContractPaths).flatMap(([key, relativePath]) => {
  const contract = tryReadJson(relativePath);
  return contract ? [[key, contract]] : [];
});

const registeredSchemaEntries = Object.entries(schemaContractPaths).flatMap(
  ([key, relativePath]) => {
    const contract = tryReadJson(relativePath);
    return contract ? [[key, contract]] : [];
  }
);

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

const registeredSchemaContracts = Object.freeze(
  Object.fromEntries(registeredSchemaEntries)
);

module.exports = {
  registeredSchemaContracts,
  registeredOpenApiContractMetadata,
  registeredOpenApiContracts,
};
