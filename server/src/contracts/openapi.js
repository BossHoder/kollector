const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

const registeredOpenApiContracts = Object.freeze({
  assetsMobileParity: readJson('specs/011-mobile-ux-parity/contracts/assets.mobile-parity.openapi.json'),
  gamification: readJson('specs/013-gamification-core/contracts/gamification.openapi.json'),
});

module.exports = {
  registeredOpenApiContracts,
};
