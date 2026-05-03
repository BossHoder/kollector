const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Subscription = require('../src/models/Subscription');
const SubscriptionUpgradeRequest = require('../src/models/SubscriptionUpgradeRequest');
const MonthlyUsageCounter = require('../src/models/MonthlyUsageCounter');
const TierAuditLog = require('../src/models/TierAuditLog');
const { getAssetThemePresets } = require('../src/modules/assets/theme-presets.catalog');
const { ENHANCEMENT_STATUS } = require('../src/modules/assets/enhancement.constants');
const {
  SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_PAYMENT_CHANNELS,
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_REQUEST_TYPES,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIERS,
} = require('../src/modules/subscription/subscription.constants');

const NOW = new Date('2026-05-03T09:00:00.000Z');
const DEFAULT_PASSWORD = 'Kollector@123';
const SEED_TAG = 'seed-real-q1-2026';
const LEGACY_MIGRATION_TAG = 'schema-migrated-q2-2026';
const ADMIN_EMAIL = 'thetruong275@gmail.com';
const FREE_THEME_IDS = ['vault-graphite', 'ledger-ivory'];
const VIP_THEME_IDS = ['museum-forest', 'archive-cobalt'];
const ALL_THEME_IDS = getAssetThemePresets().map((preset) => preset.id);
const MAY_2026_KEY = '2026-05';

const EXISTING_USER_PERSONAS = {
  'collector@example.com': {
    displayName: 'Nguyen Duy Khanh',
    bio: 'Keeps clean shelves of cameras and archive pieces.',
    focus: ['camera', 'other'],
    currency: 'USD',
  },
  'wzeob@mailto.plus': {
    displayName: 'Tran Minh Tam',
    bio: 'Mostly collects mirrorless gear and small travel items.',
    focus: ['camera', 'other'],
    currency: 'USD',
  },
  'wzesob@mailto.plus': {
    displayName: 'Le Bao Chau',
    bio: 'Likes slow LEGO builds and tidy collection photos.',
    focus: ['lego', 'camera'],
    currency: 'USD',
  },
  'grewg@gmail.com': {
    displayName: 'Pham Quoc Huy',
    bio: 'Alternates between retro sneakers and compact cameras.',
    focus: ['sneaker', 'camera'],
    currency: 'USD',
  },
  'wzesdwaob@mailto.plus': {
    displayName: 'Do Khanh Ngan',
    bio: 'Keeps a small sneaker rotation and a clean desk setup.',
    focus: ['sneaker', 'other'],
    currency: 'USD',
  },
  'thetruong275@gmail.com': {
    displayName: 'Truong The Anh',
    bio: 'Admin account used to review VIP requests and operations.',
    focus: ['camera', 'sneaker'],
    currency: 'USD',
  },
  'tester123@gmail.com': {
    displayName: 'Nguyen Hoang Long',
    bio: 'Uses the app daily to manage sneakers and shelf photos.',
    focus: ['sneaker', 'camera'],
    currency: 'USD',
  },
  'test@gmail.com': {
    displayName: 'Bui Mai Phuong',
    bio: 'Prefers LEGO display sets and careful maintenance logs.',
    focus: ['lego', 'other'],
    currency: 'USD',
  },
};

const NEW_USER_BLUEPRINTS = [
  {
    email: 'bao.ngoc.collect@gmail.com',
    displayName: 'Nguyen Bao Ngoc',
    bio: 'Weekend sneaker hunter with a neat shelf routine.',
    focus: ['sneaker', 'other'],
    createdAt: '2026-02-05T03:15:00.000Z',
    assetCount: 3,
    currency: 'USD',
  },
  {
    email: 'minhkhang.frames@outlook.com',
    displayName: 'Tran Minh Khang',
    bio: 'Shoots daily life on compact cameras and keeps gear notes.',
    focus: ['camera', 'other'],
    createdAt: '2026-02-07T11:40:00.000Z',
    assetCount: 6,
    currency: 'USD',
  },
  {
    email: 'hoaian.curates@gmail.com',
    displayName: 'Le Hoai An',
    bio: 'Curates LEGO sets and rotates a small sneaker lineup.',
    focus: ['lego', 'sneaker'],
    createdAt: '2026-02-10T05:20:00.000Z',
    assetCount: 5,
    currency: 'USD',
  },
  {
    email: 'giahan.shelf@gmail.com',
    displayName: 'Pham Gia Han',
    bio: 'Likes organized shelves, clean labels, and camera cards.',
    focus: ['camera', 'lego'],
    createdAt: '2026-02-13T08:05:00.000Z',
    assetCount: 7,
    currency: 'USD',
  },
  {
    email: 'ducminh.archive@outlook.com',
    displayName: 'Vo Duc Minh',
    bio: 'Keeps only a few pieces but tracks every maintenance pass.',
    focus: ['other', 'camera'],
    createdAt: '2026-02-17T10:45:00.000Z',
    assetCount: 2,
    currency: 'USD',
  },
  {
    email: 'khanhlinh.sneaks@gmail.com',
    displayName: 'Bui Khanh Linh',
    bio: 'Mostly sneaker pairs with a few desk collectibles.',
    focus: ['sneaker', 'other'],
    createdAt: '2026-02-19T02:30:00.000Z',
    assetCount: 8,
    currency: 'USD',
  },
  {
    email: 'tuanhuy.lens@gmail.com',
    displayName: 'Dang Tuan Huy',
    bio: 'Tracks lenses, bodies, and photo walk gear in one place.',
    focus: ['camera', 'other'],
    createdAt: '2026-02-22T07:55:00.000Z',
    assetCount: 4,
    currency: 'USD',
  },
  {
    email: 'quynhchi.collects@outlook.com',
    displayName: 'Do Quynh Chi',
    bio: 'Collects LEGO botanicals and takes bright shelf photos.',
    focus: ['lego', 'camera'],
    createdAt: '2026-02-26T12:10:00.000Z',
    assetCount: 9,
    currency: 'USD',
  },
  {
    email: 'anhthu.lego@gmail.com',
    displayName: 'Nguyen Anh Thu',
    bio: 'LEGO display collector with a side interest in sneakers.',
    focus: ['lego', 'sneaker'],
    createdAt: '2026-03-01T01:40:00.000Z',
    assetCount: 6,
    currency: 'USD',
  },
  {
    email: 'giabao.cards@gmail.com',
    displayName: 'Tran Gia Bao',
    bio: 'Keeps photo cards, one camera, and a few impulse pickups.',
    focus: ['camera', 'other'],
    createdAt: '2026-03-04T06:25:00.000Z',
    assetCount: 5,
    currency: 'USD',
  },
  {
    email: 'nhatnam.vault@gmail.com',
    displayName: 'Le Nhat Nam',
    bio: 'Builds a larger collection and uses VIP features often.',
    focus: ['sneaker', 'camera'],
    createdAt: '2026-03-07T04:15:00.000Z',
    assetCount: 11,
    currency: 'USD',
  },
  {
    email: 'thaovy.catalog@gmail.com',
    displayName: 'Phan Thao Vy',
    bio: 'Light collector who mostly checks progress from mobile.',
    focus: ['other', 'lego'],
    createdAt: '2026-03-11T09:20:00.000Z',
    assetCount: 1,
    currency: 'USD',
  },
  {
    email: 'quocdat.sole@gmail.com',
    displayName: 'Huynh Quoc Dat',
    bio: 'Logs every sneaker clean and buys through retail drops.',
    focus: ['sneaker', 'other'],
    createdAt: '2026-03-14T13:50:00.000Z',
    assetCount: 7,
    currency: 'USD',
  },
  {
    email: 'nhuy.gallery@gmail.com',
    displayName: 'Vo Nhu Y',
    bio: 'Uses the app to keep shelf photos, cards, and kits tidy.',
    focus: ['camera', 'other'],
    createdAt: '2026-03-18T03:05:00.000Z',
    assetCount: 8,
    currency: 'USD',
  },
  {
    email: 'minhquan.frames@gmail.com',
    displayName: 'Mai Minh Quan',
    bio: 'Camera hobbyist who also stores a few retired sneakers.',
    focus: ['camera', 'sneaker'],
    createdAt: '2026-03-22T11:30:00.000Z',
    assetCount: 6,
    currency: 'USD',
  },
  {
    email: 'tuongvi.collect@gmail.com',
    displayName: 'Nguyen Tuong Vi',
    bio: 'Keeps neat notes on each item and shares public cards.',
    focus: ['lego', 'other'],
    createdAt: '2026-03-25T02:45:00.000Z',
    assetCount: 4,
    currency: 'USD',
  },
  {
    email: 'ducanh.storage@outlook.com',
    displayName: 'Tran Duc Anh',
    bio: 'Power user with a bigger collection and regular uploads.',
    focus: ['sneaker', 'camera'],
    createdAt: '2026-03-29T07:35:00.000Z',
    assetCount: 5,
    currency: 'USD',
  },
  {
    email: 'phuonglinh.bricks@gmail.com',
    displayName: 'Le Phuong Linh',
    bio: 'LEGO builder who tracks wear and shelf condition weekly.',
    focus: ['lego', 'other'],
    createdAt: '2026-04-02T05:55:00.000Z',
    assetCount: 10,
    currency: 'USD',
  },
  {
    email: 'gialinh.sneaker@gmail.com',
    displayName: 'Hoang Gia Linh',
    bio: 'Sneaker collector who keeps only the best pairs active.',
    focus: ['sneaker', 'camera'],
    createdAt: '2026-04-06T10:10:00.000Z',
    assetCount: 3,
    currency: 'USD',
  },
  {
    email: 'baotram.camera@gmail.com',
    displayName: 'Doan Bao Tram',
    bio: 'Shoots on digital, scans film, and archives the results.',
    focus: ['camera', 'other'],
    createdAt: '2026-04-10T06:10:00.000Z',
    assetCount: 12,
    currency: 'USD',
  },
  {
    email: 'huuphuc.vault@gmail.com',
    displayName: 'Nguyen Huu Phuc',
    bio: 'Keeps a small but expensive collection in very clean shape.',
    focus: ['camera', 'sneaker'],
    createdAt: '2026-04-16T09:25:00.000Z',
    assetCount: 6,
    currency: 'USD',
  },
  {
    email: 'lamphuong.lego@outlook.com',
    displayName: 'Bui Lam Phuong',
    bio: 'Mostly LEGO and decor pieces, with one camera body on hand.',
    focus: ['lego', 'camera'],
    createdAt: '2026-04-21T03:15:00.000Z',
    assetCount: 2,
    currency: 'USD',
  },
  {
    email: 'khoanguyen.collect@gmail.com',
    displayName: 'Dang Khoa Nguyen',
    bio: 'Late April signup with frequent uploads and quick cleanups.',
    focus: ['sneaker', 'other'],
    createdAt: '2026-04-27T12:40:00.000Z',
    assetCount: 9,
    currency: 'USD',
  },
];

const VIP_REQUEST_USER_EMAILS = [
  'hoaian.curates@gmail.com',
  'tuanhuy.lens@gmail.com',
  'giabao.cards@gmail.com',
  'nhuy.gallery@gmail.com',
  'ducanh.storage@outlook.com',
  'lamphuong.lego@outlook.com',
];

const APPROVED_VIP_EMAILS = [
  'tuanhuy.lens@gmail.com',
  'ducanh.storage@outlook.com',
];

const CATEGORY_CATALOG = {
  sneaker: [
    { brand: 'Nike', model: 'Air Max 1', colorway: 'Sail Red', year: 2022, size: 'US 9', sku: 'AM1-SR-22' },
    { brand: 'adidas', model: 'Samba OG', colorway: 'Core Black', year: 2023, size: 'US 8.5', sku: 'SOG-CB-23' },
    { brand: 'New Balance', model: '990v4', colorway: 'Grey Navy', year: 2021, size: 'US 10', sku: '990V4-GN-21' },
    { brand: 'ASICS', model: 'Gel-Kayano 14', colorway: 'White Silver', year: 2024, size: 'US 9.5', sku: 'GK14-WS-24' },
    { brand: 'Converse', model: 'Chuck 70', colorway: 'Parchment', year: 2020, size: 'US 8', sku: 'C70-PA-20' },
  ],
  camera: [
    { brand: 'Fujifilm', model: 'X100V', colorway: 'Silver', year: 2023, serialPrefix: 'FXV', sku: 'X100V-SV' },
    { brand: 'Sony', model: 'A7 III', colorway: 'Black', year: 2021, serialPrefix: 'SA7', sku: 'A7III-BK' },
    { brand: 'Canon', model: 'AE-1 Program', colorway: 'Chrome', year: 1985, serialPrefix: 'CAE', sku: 'AE1-CH' },
    { brand: 'Nikon', model: 'FM2', colorway: 'Titan', year: 2000, serialPrefix: 'NFM', sku: 'FM2-TI' },
    { brand: 'Ricoh', model: 'GR III', colorway: 'Matte Black', year: 2022, serialPrefix: 'RGR', sku: 'GR3-MB' },
  ],
  lego: [
    { brand: 'LEGO', model: 'Botanical Collection', colorway: 'Mixed Green', year: 2024, sku: '10342' },
    { brand: 'LEGO', model: 'Speed Champions GT-R', colorway: 'Gunmetal', year: 2023, sku: '76917' },
    { brand: 'LEGO', model: 'Star Wars X-Wing', colorway: 'Classic White', year: 2022, sku: '75355' },
    { brand: 'LEGO', model: 'Architecture Tokyo', colorway: 'Blue White', year: 2021, sku: '21051' },
    { brand: 'LEGO', model: 'Technic Porsche 911 RSR', colorway: 'Orange Black', year: 2020, sku: '42096' },
  ],
  other: [
    { brand: 'Keychron', model: 'Q1 Pro', colorway: 'Carbon Black', year: 2024, sku: 'KQ1P-CB' },
    { brand: 'Seiko', model: '5 Sports', colorway: 'Deep Blue', year: 2022, sku: 'SK5-DB' },
    { brand: 'Audio-Technica', model: 'LP60X', colorway: 'Matte Black', year: 2023, sku: 'LP60X-MB' },
    { brand: 'Casio', model: 'A168', colorway: 'Silver', year: 2021, sku: 'A168-SV' },
    { brand: 'Logitech', model: 'MX Master 3S', colorway: 'Graphite', year: 2024, sku: 'MX3S-GR' },
  ],
};

function createRng(seedText) {
  let seed = parseInt(
    crypto.createHash('sha256').update(String(seedText)).digest('hex').slice(0, 8),
    16
  );
  return function next() {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, items) {
  return items[randInt(rng, 0, items.length - 1)];
}

function chance(rng, probability) {
  return rng() < probability;
}

function addDays(base, days) {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function addHours(base, hours) {
  const date = new Date(base);
  date.setUTCHours(date.getUTCHours() + hours);
  return date;
}

function interpolateDate(start, end, ratio) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + (endTime - startTime) * ratio);
}

function stripDiacritics(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function avatarUrlFor(email) {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(email)}`;
}

function remoteImageUrl(seed, width = 1200, height = 1200) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

function transferReferenceFor(email) {
  const slug = slugify(email).replace(/-/g, '').slice(0, 10).toUpperCase();
  return `KOLVIP-${slug}-0426`;
}

function buildRecentLogin(createdAt, rng) {
  const min = addHours(createdAt, 8);
  const ratio = 0.55 + rng() * 0.42;
  const candidate = interpolateDate(min, NOW, ratio);
  if (candidate > NOW) {
    return new Date(NOW);
  }
  return candidate;
}

function buildDevices(seed, createdAt, lastLoginAt) {
  const rng = createRng(`device:${seed}`);
  const count = chance(rng, 0.72) ? 1 : 2;
  const devices = [];
  for (let index = 0; index < count; index += 1) {
    const platform = pick(rng, ['android', 'android', 'ios', 'web']);
    const lastActiveAt = addHours(lastLoginAt || createdAt, -randInt(rng, 0, 36));
    devices.push({
      deviceId: `seed-${slugify(seed)}-${platform}-${index + 1}`,
      platform,
      pushToken: platform === 'web' ? null : `ExponentPushToken[${slugify(seed)}-${platform}-${index + 1}]`,
      lastActiveAt,
    });
  }
  return devices;
}

function normalizeCategory(value) {
  const allowed = new Set(['sneaker', 'camera', 'lego', 'other']);
  if (allowed.has(value)) {
    return value;
  }
  if (value === 'cards') {
    return 'other';
  }
  return pick(createRng(`category:${String(value || 'unknown')}`), ['sneaker', 'camera', 'lego', 'other']);
}

function buildSettings(currency, themeId) {
  return {
    notifications: {
      pushEnabled: true,
      emailEnabled: false,
      maintenanceReminders: true,
      marketAlerts: true,
    },
    privacy: {
      profilePublic: false,
      showNetWorth: false,
    },
    preferences: {
      theme: 'system',
      language: 'vi',
      currency: currency || 'USD',
      assetTheme: {
        defaultThemeId: themeId || FREE_THEME_IDS[0],
      },
    },
  };
}

function freeOrVipTheme(tier, rng) {
  return tier === SUBSCRIPTION_TIERS.VIP ? pick(rng, ALL_THEME_IDS) : pick(rng, FREE_THEME_IDS);
}

function determineAssetStatus(createdAt, rng) {
  const ageDays = Math.max((NOW.getTime() - createdAt.getTime()) / 86400000, 0);
  if (ageDays <= 4 && chance(rng, 0.28)) {
    return 'processing';
  }
  if (ageDays <= 12 && chance(rng, 0.12)) {
    return 'failed';
  }
  if (chance(rng, 0.08)) {
    return 'partial';
  }
  if (chance(rng, 0.1)) {
    return 'archived';
  }
  return 'active';
}

function categoryForIndex(focus, assetIndex, rng) {
  if (focus?.length && chance(rng, 0.68)) {
    return focus[assetIndex % focus.length];
  }
  return pick(rng, ['sneaker', 'camera', 'lego', 'other']);
}

function buildCatalogEntry(category, seedText) {
  const rng = createRng(`catalog:${seedText}:${category}`);
  const base = pick(rng, CATEGORY_CATALOG[category]);
  return {
    ...base,
    colorway: base.colorway || null,
    size: base.size || null,
    serialNumber:
      category === 'camera'
        ? `${base.serialPrefix}-${randInt(rng, 10000, 99999)}`
        : null,
  };
}

function buildPurchaseInfo(category, assetCreatedAt, rng) {
  const priceRangeByCategory = {
    sneaker: [110, 340],
    camera: [320, 1850],
    lego: [45, 650],
    other: [35, 320],
  };
  const [minPrice, maxPrice] = priceRangeByCategory[category];
  const amount = randInt(rng, minPrice, maxPrice);
  const purchaseDate = addDays(assetCreatedAt, -randInt(rng, 10, 380));
  return {
    price: {
      amount,
      currency: 'USD',
    },
    purchaseDate,
    source: pick(rng, ['retail', 'resale', 'gift', 'trade', 'other']),
    sourceName: pick(rng, ['StockX', 'eBay', 'Facebook Group', 'Local Store', 'Gift from friend']),
  };
}

function buildCondition(status, createdAt, rng) {
  const ageDays = Math.max((NOW.getTime() - createdAt.getTime()) / 86400000, 0);
  const decayBase = 1 + Math.floor(ageDays / 50);
  const maintenanceCount = status === 'processing' ? 0 : randInt(rng, 0, clamp(Math.floor(ageDays / 12), 1, 12));
  let health = 97 - Math.floor(ageDays * 0.14) + maintenanceCount * 2 - randInt(rng, 0, 8);
  if (status === 'archived') {
    health -= randInt(rng, 8, 18);
  }
  if (status === 'failed') {
    health -= randInt(rng, 4, 12);
  }
  if (status === 'processing') {
    health = Math.max(88, health);
  }
  health = clamp(health, 48, 100);
  const lastDecayDate = addDays(createdAt, randInt(rng, 1, Math.max(2, Math.floor(ageDays))));
  const lastMaintenanceDate =
    maintenanceCount > 0 ? addDays(NOW, -randInt(rng, 2, 45)) : null;
  return {
    health,
    decayRate: clamp(decayBase, 1, 5),
    lastDecayDate,
    lastMaintenanceDate,
    maintenanceCount,
  };
}

function buildVisualLayers(health) {
  if (health >= 90) {
    return [];
  }
  if (health >= 76) {
    return ['dust_light'];
  }
  if (health >= 61) {
    return ['dust_medium'];
  }
  if (health >= 51) {
    return ['dust_heavy'];
  }
  return ['dust_heavy', 'yellowing'];
}

function buildMaintenanceLogs(condition, createdAt, rng, isVip) {
  const logs = [];
  if (!condition.lastMaintenanceDate || condition.maintenanceCount <= 0) {
    return logs;
  }

  const totalEntries = condition.maintenanceCount;
  for (let index = 0; index < totalEntries; index += 1) {
    const ratio = (index + 1) / (totalEntries + 1);
    const date = interpolateDate(createdAt, condition.lastMaintenanceDate, ratio);
    const previousHealth = clamp(condition.health - randInt(rng, 4, 18), 35, 98);
    const restored = randInt(rng, 8, 22);
    const nextHealth = clamp(previousHealth + restored, 0, 100);
    const multiplier = isVip ? 3 : 1;
    logs.push({
      date,
      previousHealth,
      newHealth: nextHealth,
      healthRestored: nextHealth - previousHealth,
      xpAwarded: 10,
      expMultiplier: multiplier,
      xpDelta: 10 * multiplier,
    });
  }
  return logs;
}

function buildAiMetadata(status, assetCreatedAt, catalogEntry, rng) {
  if (status === 'failed') {
    return {
      error: 'Recognition failed because the image was too dark or cropped.',
      failedAt: addHours(assetCreatedAt, randInt(rng, 1, 18)),
      rawResponse: '{"status":"failed","reason":"low_signal"}',
    };
  }

  if (status === 'processing') {
    return {
      rawResponse: '{"status":"processing"}',
    };
  }

  const processedAt = addHours(assetCreatedAt, randInt(rng, 1, 10));
  const metadata = {
    brand: { value: catalogEntry.brand, confidence: Number((0.74 + rng() * 0.23).toFixed(2)) },
    model: { value: catalogEntry.model, confidence: Number((0.72 + rng() * 0.24).toFixed(2)) },
    estimatedYear: { value: catalogEntry.year, confidence: Number((0.65 + rng() * 0.28).toFixed(2)) },
    conditionNotes: pick(rng, [
      'Minor dust around edges. Overall shape is stable.',
      'Light wear on visible areas. Recommended clean once this week.',
      'Good overall condition with only small surface marks.',
      'Collector kept it clean; only light daily wear is visible.',
    ]),
    rawResponse: '{"status":"ok"}',
    processedAt,
  };

  if (status !== 'partial') {
    metadata.colorway = {
      value: catalogEntry.colorway || 'Standard',
      confidence: Number((0.68 + rng() * 0.26).toFixed(2)),
    };
  }

  if (status === 'partial') {
    metadata.error = 'Partial recognition completed. Fine detail needs a better angle.';
  }

  return metadata;
}

function buildMarketData(purchaseInfo, processedAt, rng) {
  const multiplier = 0.88 + rng() * 0.42;
  const estimatedAmount = Math.round((purchaseInfo.price.amount || 0) * multiplier);
  return {
    estimatedValue: {
      amount: estimatedAmount,
      currency: purchaseInfo.price.currency || 'USD',
    },
    benchmarkId: null,
    priceDeviation: Number((((estimatedAmount - purchaseInfo.price.amount) / purchaseInfo.price.amount) || 0).toFixed(2)),
    isAnomaly: chance(rng, 0.06),
    lastUpdated: processedAt || NOW,
  };
}

function buildSharing(seedText, rng) {
  const isPublic = chance(rng, 0.14);
  if (!isPublic) {
    return {
      isPublic: false,
      viewCount: 0,
    };
  }

  const suffix = crypto
    .createHash('sha1')
    .update(String(seedText))
    .digest('hex')
    .slice(0, 6)
    .toUpperCase();

  return {
    isPublic: true,
    shareCode: `KOL-${slugify(seedText).slice(0, 4).toUpperCase()}-${suffix}`,
    viewCount: randInt(rng, 4, 180),
  };
}

function buildCardImage(seedText, processedAt, rng) {
  if (!chance(rng, 0.38)) {
    return undefined;
  }
  return {
    url: remoteImageUrl(`${seedText}-card`, 1080, 1350),
    generatedAt: processedAt || NOW,
    expiresAt: addDays(processedAt || NOW, 45),
  };
}

function buildEnhancementBlock(status, assetCreatedAt, rng, seedText) {
  if (status === 'processing') {
    return {
      status: ENHANCEMENT_STATUS.IDLE,
      lastJobId: null,
      requestedBy: null,
      requestedAt: null,
      completedAt: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 0,
    };
  }

  if (chance(rng, 0.2)) {
    return {
      status: ENHANCEMENT_STATUS.SUCCEEDED,
      lastJobId: `enh-${slugify(seedText)}`,
      requestedBy: null,
      requestedAt: addHours(assetCreatedAt, 2),
      completedAt: addHours(assetCreatedAt, 3),
      errorCode: null,
      errorMessage: null,
      attemptCount: 1,
      image: {
        url: remoteImageUrl(`${seedText}-enhanced`, 1400, 1400),
        publicId: `seed/${slugify(seedText)}/enhanced`,
        width: 1400,
        height: 1400,
        generatedAt: addHours(assetCreatedAt, 3),
      },
    };
  }

  return {
    status: ENHANCEMENT_STATUS.IDLE,
    lastJobId: null,
    requestedBy: null,
    requestedAt: null,
    completedAt: null,
    errorCode: null,
    errorMessage: null,
    attemptCount: 0,
  };
}

function buildAssetPlan(blueprint, assetIndex, tier) {
  const rng = createRng(`asset-plan:${blueprint.email}:${assetIndex}`);
  const slug = slugify(blueprint.displayName);
  const category = categoryForIndex(blueprint.focus, assetIndex, rng);
  const createdAt = interpolateDate(
    new Date(blueprint.createdAt),
    buildRecentLogin(new Date(blueprint.createdAt), createRng(`login:${blueprint.email}`)),
    (assetIndex + 1 + rng()) / (blueprint.assetCount + 1)
  );
  const status = determineAssetStatus(createdAt, rng);
  const catalogEntry = buildCatalogEntry(category, `${blueprint.email}-${assetIndex}`);
  const purchaseInfo = buildPurchaseInfo(category, createdAt, rng);
  const condition = buildCondition(status, createdAt, rng);
  const maintenanceLogs = buildMaintenanceLogs(condition, createdAt, rng, tier === SUBSCRIPTION_TIERS.VIP);
  const aiMetadata = buildAiMetadata(status, createdAt, catalogEntry, rng);
  const sharing = buildSharing(`${blueprint.email}-${assetIndex}`, rng);
  const enhancement = buildEnhancementBlock(status, createdAt, rng, `${blueprint.email}-${assetIndex}`);
  const processedAt = aiMetadata.processedAt || null;
  const originalSeed = `${slug}-${category}-${assetIndex + 1}`;
  const themeOverrideId =
    tier === SUBSCRIPTION_TIERS.VIP && chance(rng, 0.46)
      ? pick(rng, ALL_THEME_IDS)
      : chance(rng, 0.22)
        ? pick(rng, FREE_THEME_IDS)
        : null;

  return {
    originalFilename: `${slug}-${String(assetIndex + 1).padStart(2, '0')}.jpg`,
    category,
    status,
    createdAt,
    images: {
      original: {
        url: remoteImageUrl(`${originalSeed}-original`),
        publicId: `seed/${slug}/${String(assetIndex + 1).padStart(2, '0')}/original`,
        uploadedAt: createdAt,
      },
      processed:
        status === 'active' || status === 'partial' || status === 'archived'
          ? {
              url: remoteImageUrl(`${originalSeed}-processed`),
              publicId: `seed/${slug}/${String(assetIndex + 1).padStart(2, '0')}/processed`,
              processedAt,
            }
          : undefined,
      thumbnail: {
        url: remoteImageUrl(`${originalSeed}-thumb`, 500, 500),
        publicId: `seed/${slug}/${String(assetIndex + 1).padStart(2, '0')}/thumb`,
      },
      card: buildCardImage(originalSeed, processedAt, rng),
      enhanced: enhancement.image,
    },
    presentation: {
      themeOverrideId,
    },
    enhancement,
    originalFilenameSafe: `${slug}-${String(assetIndex + 1).padStart(2, '0')}.jpg`,
    mimeType: 'image/jpeg',
    fileSizeBytes: randInt(rng, 420000, 5400000),
    aiMetadata,
    details: {
      brand: catalogEntry.brand,
      model: catalogEntry.model,
      colorway: catalogEntry.colorway,
      size: catalogEntry.size,
      sku: catalogEntry.sku,
      serialNumber: catalogEntry.serialNumber,
      description: `${catalogEntry.brand} ${catalogEntry.model} kept in a personal collection.`,
      tags: [
        SEED_TAG,
        category,
        slugify(catalogEntry.brand),
        slugify(catalogEntry.model),
      ],
    },
    purchaseInfo,
    condition,
    visualLayers: buildVisualLayers(condition.health),
    maintenanceLogs,
    nfc:
      chance(rng, 0.12)
        ? {
            tagId: `nfc-${slug}-${String(assetIndex + 1).padStart(2, '0')}`,
            linkedAt: addDays(createdAt, randInt(rng, 1, 21)),
            scanCount: randInt(rng, 1, 18),
          }
        : undefined,
    marketData: buildMarketData(purchaseInfo, processedAt, rng),
    sharing,
    processingJobId: status === 'processing' ? `job-${slug}-${assetIndex + 1}` : null,
    version: 1,
  };
}

function buildLegacyAssetDefaults(asset, owner, tier) {
  const seedText = `${asset._id}:${owner?.email || asset.userId}`;
  const rng = createRng(`legacy:${seedText}`);
  const category = normalizeCategory(asset.category);
  const catalogEntry = buildCatalogEntry(category, seedText);
  const purchaseInfo = asset.purchaseInfo?.price?.amount
    ? asset.purchaseInfo
    : buildPurchaseInfo(category, asset.createdAt || NOW, rng);
  const condition = buildCondition(asset.status || 'active', asset.createdAt || NOW, rng);
  const existingTags = Array.isArray(asset.details?.tags) ? asset.details.tags : [];
  const mergedTags = Array.from(
    new Set([...existingTags, category, slugify(catalogEntry.brand), LEGACY_MIGRATION_TAG].filter(Boolean))
  );
  const aiMetadata = asset.aiMetadata || {};
  if ((asset.status === 'active' || asset.status === 'partial' || asset.status === 'archived') && !aiMetadata.brand?.value) {
    const seededMetadata = buildAiMetadata(asset.status, asset.createdAt || NOW, catalogEntry, rng);
    Object.assign(aiMetadata, seededMetadata);
  }
  if (asset.status === 'failed' && !aiMetadata.error) {
    aiMetadata.error = 'Recognition failed because the source photo lacked enough detail.';
    aiMetadata.failedAt = aiMetadata.failedAt || addHours(asset.createdAt || NOW, 4);
  }
  if (asset.status === 'processing') {
    aiMetadata.rawResponse = aiMetadata.rawResponse || '{"status":"processing"}';
  }

  return {
    category,
    details: {
      brand: asset.details?.brand || catalogEntry.brand,
      model: asset.details?.model || catalogEntry.model,
      colorway: asset.details?.colorway || catalogEntry.colorway || null,
      size: asset.details?.size || catalogEntry.size || null,
      sku: asset.details?.sku || catalogEntry.sku || null,
      serialNumber: asset.details?.serialNumber || catalogEntry.serialNumber || null,
      description:
        asset.details?.description || `${catalogEntry.brand} ${catalogEntry.model} kept in a personal collection.`,
      tags: mergedTags,
    },
    purchaseInfo: {
      ...purchaseInfo,
      price: {
        amount: purchaseInfo.price?.amount || randInt(rng, 60, 420),
        currency: purchaseInfo.price?.currency || 'USD',
      },
      source: purchaseInfo.source || pick(rng, ['retail', 'resale', 'gift', 'trade', 'other']),
      sourceName: purchaseInfo.sourceName || pick(rng, ['StockX', 'eBay', 'Local Store', 'Gift from friend']),
    },
    condition: {
      health: asset.condition?.health != null ? clamp(asset.condition.health, 40, 100) : condition.health,
      decayRate: asset.condition?.decayRate != null ? asset.condition.decayRate : condition.decayRate,
      lastDecayDate: asset.condition?.lastDecayDate || condition.lastDecayDate,
      lastMaintenanceDate: asset.condition?.lastMaintenanceDate || condition.lastMaintenanceDate,
      maintenanceCount:
        asset.condition?.maintenanceCount != null
          ? asset.condition.maintenanceCount
          : condition.maintenanceCount,
    },
    visualLayers:
      Array.isArray(asset.visualLayers) && asset.visualLayers.length > 0
        ? asset.visualLayers
        : buildVisualLayers(asset.condition?.health != null ? asset.condition.health : condition.health),
    maintenanceLogs:
      Array.isArray(asset.maintenanceLogs) && asset.maintenanceLogs.length > 0
        ? asset.maintenanceLogs
        : buildMaintenanceLogs(condition, asset.createdAt || NOW, rng, tier === SUBSCRIPTION_TIERS.VIP),
    presentation: {
      themeOverrideId:
        asset.presentation?.themeOverrideId && ALL_THEME_IDS.includes(asset.presentation.themeOverrideId)
          ? asset.presentation.themeOverrideId
          : null,
    },
    enhancement: {
      status: asset.enhancement?.status || ENHANCEMENT_STATUS.IDLE,
      lastJobId: asset.enhancement?.lastJobId || null,
      requestedBy: asset.enhancement?.requestedBy || null,
      requestedAt: asset.enhancement?.requestedAt || null,
      completedAt: asset.enhancement?.completedAt || null,
      errorCode: asset.enhancement?.errorCode || null,
      errorMessage: asset.enhancement?.errorMessage || null,
      attemptCount: asset.enhancement?.attemptCount || 0,
    },
    originalFilename: asset.originalFilename || `${slugify(owner?.profile?.displayName || 'legacy')}-${String(asset._id).slice(-6)}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    fileSizeBytes: asset.fileSizeBytes || randInt(rng, 380000, 4800000),
    aiMetadata,
    marketData:
      asset.marketData?.estimatedValue?.amount
        ? asset.marketData
        : buildMarketData(purchaseInfo, aiMetadata.processedAt || NOW, rng),
    sharing: {
      isPublic: Boolean(asset.sharing?.isPublic),
      ...(asset.sharing?.isPublic
        ? {
            shareCode: asset.sharing.shareCode || `KOL-${String(asset._id).slice(-8).toUpperCase()}`,
          }
        : {}),
      viewCount: asset.sharing?.viewCount || 0,
    },
    processingJobId: asset.status === 'processing' ? asset.processingJobId || `job-${String(asset._id)}` : null,
  };
}

async function findOrCreateUser(blueprint, passwordHash) {
  let user = await User.findOne({ email: blueprint.email }).select('+passwordHash');
  const isNew = !user;

  if (!user) {
    user = new User({
      email: blueprint.email,
      passwordHash,
      createdAt: new Date(blueprint.createdAt),
    });
  }

  return { user, isNew };
}

async function ensureUserDocument(user, blueprint, tier) {
  const rng = createRng(`user:${blueprint.email}`);
  const createdAt = user.createdAt || new Date(blueprint.createdAt) || NOW;
  const lastLoginAt = user.lastLoginAt || buildRecentLogin(createdAt, rng);
  const role = blueprint.email === ADMIN_EMAIL ? 'admin' : user.role || 'user';
  const themeId = freeOrVipTheme(tier, rng);

  user.email = blueprint.email;
  user.passwordHash = user.passwordHash || (await bcrypt.hash(DEFAULT_PASSWORD, 12));
  user.profile = {
    displayName: blueprint.displayName,
    avatarUrl: avatarUrlFor(blueprint.email),
    bio: blueprint.bio,
  };
  user.settings = buildSettings(blueprint.currency, themeId);
  user.devices = buildDevices(blueprint.email, createdAt, lastLoginAt);
  user.status = 'active';
  user.role = role;
  user.lastLoginAt = lastLoginAt;
  user.gamification = user.gamification || {};
  user.gamification.totalXp = user.gamification.totalXp || 0;
  user.gamification.totalNetWorth = user.gamification.totalNetWorth || 0;
  user.gamification.avgCollectionHealth = user.gamification.avgCollectionHealth || 100;
  user.gamification.maintenanceStreak = user.gamification.maintenanceStreak || 0;
  user.gamification.lastMaintenanceDate = user.gamification.lastMaintenanceDate || null;
  user.gamification.badges = Array.isArray(user.gamification.badges) ? user.gamification.badges : [];
  user.gamification.stats = {
    totalItemsOwned: user.gamification.stats?.totalItemsOwned || 0,
    totalCleaningsDone: user.gamification.stats?.totalCleaningsDone || 0,
    totalCardsGenerated: user.gamification.stats?.totalCardsGenerated || 0,
  };

  await user.save();
  return user;
}

async function ensureLegacyUsers() {
  const users = await User.find({}).sort({ createdAt: 1 }).select('+passwordHash');
  let migrated = 0;

  for (const user of users) {
    const persona = EXISTING_USER_PERSONAS[user.email] || {
      email: user.email,
      displayName: stripDiacritics(user.profile?.displayName || user.email.split('@')[0])
        .replace(/[^A-Za-z0-9 ]+/g, ' ')
        .trim()
        .slice(0, 50) || 'Kollector User',
      bio: 'Longer-time account migrated to the latest user profile shape.',
      focus: ['other', 'camera'],
      currency: 'USD',
      createdAt: user.createdAt || NOW,
    };
    const tier = user.email === ADMIN_EMAIL ? SUBSCRIPTION_TIERS.VIP : SUBSCRIPTION_TIERS.FREE;
    await ensureUserDocument(user, { ...persona, email: user.email, createdAt: user.createdAt }, tier);
    migrated += 1;
  }

  return { migrated, users: await User.find({}).sort({ createdAt: 1 }).lean() };
}

async function ensureSeedUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const results = {
    created: 0,
    updated: 0,
    users: [],
  };

  for (const blueprint of NEW_USER_BLUEPRINTS) {
    const desiredTier = APPROVED_VIP_EMAILS.includes(blueprint.email)
      ? SUBSCRIPTION_TIERS.VIP
      : SUBSCRIPTION_TIERS.FREE;
    const { user, isNew } = await findOrCreateUser(blueprint, passwordHash);
    await ensureUserDocument(user, blueprint, desiredTier);
    results[isNew ? 'created' : 'updated'] += 1;
    results.users.push(user.toObject());
  }

  return results;
}

async function ensureSubscription(userId, payload) {
  await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        tier: payload.tier,
        status: payload.status,
        paymentChannel: payload.paymentChannel || SUBSCRIPTION_PAYMENT_CHANNELS.MANUAL_BANK,
        activatedAt: payload.activatedAt || NOW,
        expiresAt: payload.expiresAt || null,
        graceEndsAt: payload.graceEndsAt || null,
        lastApprovedRequestId: payload.lastApprovedRequestId || null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function ensureSubscriptionsForAllUsers(allUsersByEmail) {
  const vipEmails = new Set([ADMIN_EMAIL, ...APPROVED_VIP_EMAILS]);
  for (const [email, user] of allUsersByEmail.entries()) {
    if (vipEmails.has(email)) {
      const activationDate =
        email === ADMIN_EMAIL ? new Date('2026-04-08T08:00:00.000Z') : new Date('2026-04-28T10:00:00.000Z');
      await ensureSubscription(user._id, {
        tier: SUBSCRIPTION_TIERS.VIP,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        activatedAt: activationDate,
        expiresAt: addDays(activationDate, 30),
      });
      continue;
    }

    await ensureSubscription(user._id, {
      tier: SUBSCRIPTION_TIERS.FREE,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      activatedAt: user.createdAt || NOW,
    });
  }
}

async function ensureTierAuditLog({ userId, actorId, fromTier, toTier, reason, effectiveAt, expiresAt }) {
  const existing = await TierAuditLog.findOne({
    userId,
    actorId,
    fromTier,
    toTier,
    reason,
    effectiveAt,
  });

  if (existing) {
    return existing;
  }

  return TierAuditLog.create({
    userId,
    actorId,
    fromTier,
    toTier,
    reason,
    effectiveAt,
    expiresAt: expiresAt || null,
  });
}

async function ensureVipRequests(allUsersByEmail) {
  const adminUser = allUsersByEmail.get(ADMIN_EMAIL);
  let created = 0;
  let updated = 0;
  const approvedRequestIdsByEmail = new Map();

  for (const email of VIP_REQUEST_USER_EMAILS) {
    const user = allUsersByEmail.get(email);
    if (!user) {
      continue;
    }

    const approved = APPROVED_VIP_EMAILS.includes(email);
    const rejected = email === 'giabao.cards@gmail.com';
    const submittedAt = approved
      ? new Date('2026-04-27T07:30:00.000Z')
      : rejected
        ? new Date('2026-04-25T04:15:00.000Z')
        : new Date('2026-04-29T09:20:00.000Z');
    let request = await SubscriptionUpgradeRequest.findOne({
      userId: user._id,
      transferReference: transferReferenceFor(email),
    });
    const isNew = !request;

    if (!request) {
      request = new SubscriptionUpgradeRequest({
        userId: user._id,
        type: SUBSCRIPTION_REQUEST_TYPES.UPGRADE,
        transferReference: transferReferenceFor(email),
      });
    }

    request.type = SUBSCRIPTION_REQUEST_TYPES.UPGRADE;
    request.status = approved
      ? SUBSCRIPTION_REQUEST_STATUS.APPROVED
      : rejected
        ? SUBSCRIPTION_REQUEST_STATUS.REJECTED
        : SUBSCRIPTION_REQUEST_STATUS.PENDING;
    request.submittedAt = submittedAt;
    request.reviewedAt = approved || rejected ? addHours(submittedAt, 8) : null;
    request.reviewedBy = approved || rejected ? adminUser?._id || null : null;
    request.rejectionReason = rejected ? 'Proof image did not match the transfer amount.' : null;
    request.proofFile = {
      storageUrl: remoteImageUrl(`proof-${slugify(email)}`, 900, 1400),
      uploadedAt: submittedAt,
      deleteAt: addDays(submittedAt, 30),
    };
    request.proofMetadata = {
      amount: 0.99,
      currency: 'USD',
      bankLabel: pick(createRng(`bank:${email}`), ['MB Bank', 'Techcombank', 'Vietcombank']),
      payerMask: `***${String(randInt(createRng(`mask:${email}`), 1000, 9999))}`,
    };
    request.proofFilePurgedAt = null;
    request.metadataExpireAt = addDays(submittedAt, 180);
    request.metadataPurgedAt = null;
    await request.save();

    if (isNew) {
      created += 1;
    } else {
      updated += 1;
    }

    if (approved) {
      approvedRequestIdsByEmail.set(email, request._id);
    }
  }

  return { created, updated, approvedRequestIdsByEmail };
}

async function seedAssetsForNewUsers(allUsersByEmail) {
  let created = 0;
  let updated = 0;

  for (const blueprint of NEW_USER_BLUEPRINTS) {
    const user = allUsersByEmail.get(blueprint.email);
    if (!user) {
      continue;
    }
    const tier = APPROVED_VIP_EMAILS.includes(blueprint.email)
      ? SUBSCRIPTION_TIERS.VIP
      : SUBSCRIPTION_TIERS.FREE;

    for (let index = 0; index < blueprint.assetCount; index += 1) {
      const plan = buildAssetPlan(blueprint, index, tier);
      let asset = await Asset.findOne({
        userId: user._id,
        originalFilename: plan.originalFilename,
      });
      const isNew = !asset;

      if (!asset) {
        asset = new Asset({
          userId: user._id,
          createdAt: plan.createdAt,
          originalFilename: plan.originalFilename,
        });
      }

      asset.userId = user._id;
      asset.category = plan.category;
      asset.status = plan.status;
      asset.images = {
        original: {
          ...(asset.images?.original?.toObject ? asset.images.original.toObject() : asset.images?.original || {}),
          url: plan.images.original.url,
          publicId: plan.images.original.publicId,
          uploadedAt: plan.images.original.uploadedAt,
        },
        processed: plan.images.processed,
        thumbnail: plan.images.thumbnail,
        card: plan.images.card,
        enhanced: plan.images.enhanced,
      };
      asset.presentation = plan.presentation;
      asset.enhancement = {
        status: plan.enhancement.status,
        lastJobId: plan.enhancement.lastJobId,
        requestedBy: plan.enhancement.requestedBy,
        requestedAt: plan.enhancement.requestedAt,
        completedAt: plan.enhancement.completedAt,
        errorCode: plan.enhancement.errorCode,
        errorMessage: plan.enhancement.errorMessage,
        attemptCount: plan.enhancement.attemptCount,
      };
      asset.originalFilename = plan.originalFilename;
      asset.mimeType = plan.mimeType;
      asset.fileSizeBytes = plan.fileSizeBytes;
      asset.aiMetadata = plan.aiMetadata;
      asset.details = plan.details;
      asset.purchaseInfo = plan.purchaseInfo;
      asset.condition = plan.condition;
      asset.visualLayers = plan.visualLayers;
      asset.maintenanceLogs = plan.maintenanceLogs;
      asset.nfc = plan.nfc;
      asset.marketData = plan.marketData;
      asset.sharing = plan.sharing;
      asset.processingJobId = plan.processingJobId;
      asset.version = 1;
      await asset.save();

      if (isNew) {
        created += 1;
      } else {
        updated += 1;
      }
    }
  }

  return { created, updated };
}

async function migrateLegacyAssets(allUsersById, vipEmails) {
  const assets = await Asset.find({
    'details.tags': { $ne: SEED_TAG },
  });
  let migrated = 0;

  for (const asset of assets) {
    const owner = allUsersById.get(String(asset.userId));
    const tier = owner && vipEmails.has(owner.email) ? SUBSCRIPTION_TIERS.VIP : SUBSCRIPTION_TIERS.FREE;
    const defaults = buildLegacyAssetDefaults(asset, owner, tier);

    asset.category = defaults.category;
    asset.details = defaults.details;
    asset.purchaseInfo = defaults.purchaseInfo;
    asset.condition = defaults.condition;
    asset.visualLayers = defaults.visualLayers;
    asset.maintenanceLogs = defaults.maintenanceLogs;
    asset.presentation = defaults.presentation;
    asset.enhancement = defaults.enhancement;
    asset.originalFilename = asset.originalFilename || defaults.originalFilename;
    asset.mimeType = asset.mimeType || defaults.mimeType;
    asset.fileSizeBytes = asset.fileSizeBytes || defaults.fileSizeBytes;
    asset.aiMetadata = defaults.aiMetadata;
    asset.marketData = defaults.marketData;
    asset.sharing = defaults.sharing;
    asset.processingJobId = defaults.processingJobId;
    if (!asset.images?.thumbnail?.url && asset.images?.original?.url) {
      asset.images.thumbnail = {
        url: asset.images.original.url,
        publicId: asset.images.original.publicId || null,
      };
    }
    if (
      (asset.status === 'active' || asset.status === 'partial' || asset.status === 'archived')
      && !asset.images?.processed?.url
      && asset.images?.original?.url
    ) {
      asset.images.processed = {
        url: asset.images.original.url,
        publicId: asset.images.original.publicId || null,
        processedAt: asset.aiMetadata?.processedAt || addHours(asset.createdAt || NOW, 2),
      };
    }
    await asset.save();
    migrated += 1;
  }

  return migrated;
}

async function refreshUserGamification(allUsersById, vipEmails) {
  for (const [userId, user] of allUsersById.entries()) {
    const assets = await Asset.find({ userId }).lean();
    const totalItemsOwned = assets.length;
    const totalNetWorth = assets.reduce(
      (sum, asset) => sum + Number(asset.marketData?.estimatedValue?.amount || 0),
      0
    );
    const totalHealth = assets.reduce((sum, asset) => sum + Number(asset.condition?.health || 0), 0);
    const avgCollectionHealth = totalItemsOwned > 0 ? Math.round(totalHealth / totalItemsOwned) : 100;
    const totalCleaningsDone = assets.reduce(
      (sum, asset) => sum + (Array.isArray(asset.maintenanceLogs) ? asset.maintenanceLogs.length : 0),
      0
    );
    const totalCardsGenerated = assets.filter((asset) => asset.images?.card?.url).length;
    const lastMaintenanceDate = assets
      .map((asset) => asset.condition?.lastMaintenanceDate)
      .filter(Boolean)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;
    const maintenanceStreak = lastMaintenanceDate
      ? clamp(Math.floor((NOW.getTime() - new Date(lastMaintenanceDate).getTime()) / 86400000) <= 7 ? randInt(createRng(`streak:${user.email}`), 3, 11) : randInt(createRng(`streak:${user.email}`), 0, 4), 0, 12)
      : 0;
    const vipMultiplier = vipEmails.has(user.email) ? SUBSCRIPTION_LIMITS.vip.maintenanceExpMultiplier : 1;
    const totalXp = totalItemsOwned * 24 + totalCardsGenerated * 12 + totalCleaningsDone * 10 * vipMultiplier;
    const badges = [];
    if (totalCleaningsDone > 0) {
      badges.push('FIRST_CLEAN');
    }
    if (maintenanceStreak >= 7) {
      badges.push('7_DAY_STREAK');
    }
    if (avgCollectionHealth >= 90 && totalItemsOwned >= 5) {
      badges.push('PRISTINE_COLLECTION');
    }

    const doc = await User.findById(userId).select('+passwordHash');
    if (!doc) {
      continue;
    }

    doc.gamification = {
      totalXp,
      totalNetWorth,
      avgCollectionHealth,
      maintenanceStreak,
      lastMaintenanceDate,
      badges,
      stats: {
        totalItemsOwned,
        totalCleaningsDone,
        totalCardsGenerated,
      },
    };
    await doc.save();
  }
}

async function ensureMonthlyUsageCounters(allUsersByEmail, vipEmails) {
  let upserted = 0;
  for (const [email, user] of allUsersByEmail.entries()) {
    const rng = createRng(`quota:${email}`);
    const tier = vipEmails.has(email) ? SUBSCRIPTION_TIERS.VIP : SUBSCRIPTION_TIERS.FREE;
    const allowance = SUBSCRIPTION_LIMITS[tier].monthlyProcessingLimit;
    const assetCount = await Asset.countDocuments({ userId: user._id });
    const consumedCount = clamp(
      randInt(rng, 0, Math.min(tier === SUBSCRIPTION_TIERS.VIP ? 18 : 6, Math.max(assetCount, 1))),
      0,
      allowance
    );
    const reservedCount = Math.min(consumedCount + (chance(rng, 0.25) ? 1 : 0), allowance);
    const releasedCount = consumedCount > 0 && chance(rng, 0.2) ? 1 : 0;
    await MonthlyUsageCounter.findOneAndUpdate(
      { userId: user._id, monthKey: MAY_2026_KEY },
      {
        $set: {
          tierAtWindowStart: tier,
          allowance,
          reservedCount,
          consumedCount,
          releasedCount,
          updatedAt: NOW,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    upserted += 1;
  }

  return upserted;
}

async function applyApprovedVipState(allUsersByEmail, approvedRequestIdsByEmail) {
  const adminUser = allUsersByEmail.get(ADMIN_EMAIL);

  for (const email of APPROVED_VIP_EMAILS) {
    const user = allUsersByEmail.get(email);
    const requestId = approvedRequestIdsByEmail.get(email) || null;
    const activationDate = new Date('2026-04-28T10:00:00.000Z');
    await ensureSubscription(user._id, {
      tier: SUBSCRIPTION_TIERS.VIP,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      activatedAt: activationDate,
      expiresAt: addDays(activationDate, 30),
      lastApprovedRequestId: requestId,
    });
    await ensureTierAuditLog({
      userId: user._id,
      actorId: adminUser._id,
      fromTier: SUBSCRIPTION_TIERS.FREE,
      toTier: SUBSCRIPTION_TIERS.VIP,
      reason: 'upgrade_approved',
      effectiveAt: activationDate,
      expiresAt: addDays(activationDate, 30),
    });
  }

  await ensureTierAuditLog({
    userId: adminUser._id,
    actorId: adminUser._id,
    fromTier: SUBSCRIPTION_TIERS.FREE,
    toTier: SUBSCRIPTION_TIERS.VIP,
    reason: 'upgrade_approved',
    effectiveAt: new Date('2026-04-08T08:00:00.000Z'),
    expiresAt: addDays(new Date('2026-04-08T08:00:00.000Z'), 30),
  });
}

async function main() {
  const summary = {
    legacyUsersMigrated: 0,
    seedUsersCreated: 0,
    seedUsersUpdated: 0,
    vipRequestsCreated: 0,
    vipRequestsUpdated: 0,
    seedAssetsCreated: 0,
    seedAssetsUpdated: 0,
    legacyAssetsMigrated: 0,
    monthlyCountersUpserted: 0,
  };

  await connectDatabase();

  try {
    const legacy = await ensureLegacyUsers();
    summary.legacyUsersMigrated = legacy.migrated;

    const seededUsers = await ensureSeedUsers();
    summary.seedUsersCreated = seededUsers.created;
    summary.seedUsersUpdated = seededUsers.updated;

    const allUsers = await User.find({}).lean();
    const allUsersByEmail = new Map(allUsers.map((user) => [user.email, user]));
    const allUsersById = new Map(allUsers.map((user) => [String(user._id), user]));
    const vipEmails = new Set([ADMIN_EMAIL, ...APPROVED_VIP_EMAILS]);

    await ensureSubscriptionsForAllUsers(allUsersByEmail);

    const vipRequests = await ensureVipRequests(allUsersByEmail);
    summary.vipRequestsCreated = vipRequests.created;
    summary.vipRequestsUpdated = vipRequests.updated;

    await applyApprovedVipState(allUsersByEmail, vipRequests.approvedRequestIdsByEmail);

    const seededAssets = await seedAssetsForNewUsers(allUsersByEmail);
    summary.seedAssetsCreated = seededAssets.created;
    summary.seedAssetsUpdated = seededAssets.updated;

    summary.legacyAssetsMigrated = await migrateLegacyAssets(allUsersById, vipEmails);
    summary.monthlyCountersUpserted = await ensureMonthlyUsageCounters(allUsersByEmail, vipEmails);

    const refreshedUsers = await User.find({}).lean();
    const refreshedById = new Map(refreshedUsers.map((user) => [String(user._id), user]));
    await refreshUserGamification(refreshedById, vipEmails);

    const [userCount, assetCount, subscriptionCount, requestCount] = await Promise.all([
      User.countDocuments(),
      Asset.countDocuments(),
      Subscription.countDocuments(),
      SubscriptionUpgradeRequest.countDocuments(),
    ]);

    console.log(
      JSON.stringify(
        {
          summary,
          finalCounts: {
            users: userCount,
            assets: assetCount,
            subscriptions: subscriptionCount,
            vipRequests: requestCount,
          },
          seededUserEmails: NEW_USER_BLUEPRINTS.map((item) => item.email),
          vipUsers: [ADMIN_EMAIL, ...APPROVED_VIP_EMAILS],
        },
        null,
        2
      )
    );
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
