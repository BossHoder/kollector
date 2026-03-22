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

const registeredOpenApiContracts = Object.freeze(
  Object.fromEntries(
    Object.entries({
      assetsMobileParity: 'specs/011-mobile-ux-parity/contracts/assets.mobile-parity.openapi.json',
      gamification: 'specs/013-gamification-core/contracts/gamification.openapi.json',
    }).flatMap(([key, relativePath]) => {
      const contract = tryReadJson(relativePath);
      return contract ? [[key, contract]] : [];
    })
  )
);

module.exports = {
  registeredOpenApiContracts,
};
