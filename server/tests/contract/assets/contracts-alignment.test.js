const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../../');

const sortValues = (values) => [...values].sort();

const readText = (relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
};

const readJson = (relativePath) => JSON.parse(readText(relativePath));

const extractQuotedValues = (text) => {
  const matches = text.match(/'([^']+)'/g) || [];
  return matches.map((item) => item.slice(1, -1));
};

const extractEnumFromModel = (modelText, fieldName) => {
  const enumRegex = new RegExp(`${fieldName}:\\s*\\{[^}]*enum:\\s*\\[([^\\]]+)\\]`);
  const match = modelText.match(enumRegex);
  if (!match) {
    throw new Error(`Could not extract enum for ${fieldName} from Asset model`);
  }
  return extractQuotedValues(match[1]);
};

const extractStatusUnionFromWebType = (typeText) => {
  const match = typeText.match(/export type AssetStatus = ([^;]+);/);
  if (!match) {
    throw new Error('Could not extract AssetStatus union from web type file');
  }
  return extractQuotedValues(match[1]);
};

const extractStatusKeysFromMobileDisplay = (statusDisplayText) => {
  const blockMatch = statusDisplayText.match(/export const STATUS_DISPLAY = \{([\s\S]*?)\n\};/);
  if (!blockMatch) {
    throw new Error('Could not extract STATUS_DISPLAY block from mobile status display');
  }

  const keys = [];
  const keyRegex = /^\s{2}(\w+):\s*\{/gm;
  let keyMatch;

  while ((keyMatch = keyRegex.exec(blockMatch[1])) !== null) {
    keys.push(keyMatch[1]);
  }

  return keys;
};

describe('assets contract alignment (server/web/mobile)', () => {
  const aliasSchema = readJson('specs/004-mobile-ux-parity/contracts/category-aliases.schema.json');
  const openApi = readJson('specs/004-mobile-ux-parity/contracts/assets.mobile-parity.openapi.json');
  const assetModelText = readText('server/src/models/Asset.js');
  const webCategoriesText = readText('web/src/lib/categories.ts');
  const webAssetTypesText = readText('web/src/types/asset.ts');
  const mobileCategoriesText = readText('mobile/src/config/categories.js');
  const mobileStatusDisplayText = readText('mobile/src/utils/statusDisplay.js');

  it('keeps canonical category contract aligned across spec/server/web/mobile', () => {
    const specCanonical = aliasSchema?.properties?.canonical?.items?.enum;
    const openApiCategoryEnum = openApi.components.schemas.Category.enum;

    const serverCategories = extractEnumFromModel(assetModelText, 'category');

    const webCanonicalMatch = webCategoriesText.match(/CANONICAL_CATEGORIES = \[([^\]]+)\]/);
    if (!webCanonicalMatch) {
      throw new Error('Could not extract CANONICAL_CATEGORIES from web categories file');
    }
    const webCanonical = extractQuotedValues(webCanonicalMatch[1]);

    const mobileCanonicalMatch = mobileCategoriesText.match(/CANONICAL_CATEGORIES = \[([^\]]+)\]/);
    if (!mobileCanonicalMatch) {
      throw new Error('Could not extract CANONICAL_CATEGORIES from mobile categories file');
    }
    const mobileCanonical = extractQuotedValues(mobileCanonicalMatch[1]);

    expect(specCanonical).toBeDefined();
    expect(sortValues(specCanonical)).toEqual(sortValues(['sneaker', 'lego', 'camera', 'other']));
    expect(sortValues(openApiCategoryEnum)).toEqual(sortValues(specCanonical));
    expect(sortValues(serverCategories)).toEqual(sortValues(specCanonical));
    expect(sortValues(webCanonical)).toEqual(sortValues(specCanonical));
    expect(sortValues(mobileCanonical)).toEqual(sortValues(specCanonical));
  });

  it('keeps status contract aligned across openapi/server/web/mobile', () => {
    const openApiStatuses = openApi.components.schemas.Status.enum;
    const serverStatuses = extractEnumFromModel(assetModelText, 'status');
    const webStatuses = extractStatusUnionFromWebType(webAssetTypesText);
    const mobileStatuses = extractStatusKeysFromMobileDisplay(mobileStatusDisplayText);

    const expected = ['draft', 'processing', 'partial', 'active', 'archived', 'failed'];

    expect(sortValues(openApiStatuses)).toEqual(sortValues(expected));
    expect(sortValues(serverStatuses)).toEqual(sortValues(expected));
    expect(sortValues(webStatuses)).toEqual(sortValues(expected));
    expect(sortValues(mobileStatuses)).toEqual(sortValues(expected));
  });
});
