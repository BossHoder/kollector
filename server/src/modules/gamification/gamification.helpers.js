const DAY_IN_MS = 24 * 60 * 60 * 1000;

const CATEGORY_MODIFIERS = Object.freeze({
  sneaker: 1.5,
  lego: 0.8,
  camera: 1.2,
  other: 1.0,
});

const BADGES = Object.freeze({
  FIRST_CLEAN: 'FIRST_CLEAN',
  SEVEN_DAY_STREAK: '7_DAY_STREAK',
  PRISTINE_COLLECTION: 'PRISTINE_COLLECTION',
});

const BASE_DAILY_DECAY = 2;
const BASE_RESTORE_POINTS = 25;
const STREAK_INCREMENT_PERCENT = 5;
const MAX_STREAK_BONUS_PERCENT = 15;
const MAX_HEALTH = 100;
const MAINTENANCE_XP = 10;

function calculateMaintenanceXpAward(multiplier = 1, baseXp = MAINTENANCE_XP) {
  const normalizedMultiplier = Number.isFinite(Number(multiplier))
    ? Math.max(Number(multiplier), 1)
    : 1;

  return Math.round(Number(baseXp) * normalizedMultiplier);
}

function roundHealth(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clampHealth(value) {
  return roundHealth(Math.max(0, Math.min(MAX_HEALTH, Number(value) || 0)));
}

function computeVisualLayersForHealth(health) {
  const normalizedHealth = clampHealth(health);

  if (normalizedHealth >= 80) {
    return [];
  }

  if (normalizedHealth >= 60) {
    return ['dust_light'];
  }

  if (normalizedHealth >= 40) {
    return ['dust_medium'];
  }

  if (normalizedHealth >= 20) {
    return ['dust_heavy'];
  }

  return ['dust_heavy', 'yellowing'];
}

function getCategoryModifier(category) {
  return CATEGORY_MODIFIERS[category] || CATEGORY_MODIFIERS.other;
}

function calculateDailyDecayAmount(category) {
  return roundHealth(BASE_DAILY_DECAY * getCategoryModifier(category));
}

function calculateDecayedHealth(currentHealth, category) {
  return clampHealth(Number(currentHealth || 0) - calculateDailyDecayAmount(category));
}

function getUtcDayStart(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getUtcDayDifference(previousValue, nextValue) {
  const previousDay = getUtcDayStart(previousValue);
  const nextDay = getUtcDayStart(nextValue);

  if (previousDay === null || nextDay === null) {
    return null;
  }

  return Math.floor((nextDay - previousDay) / DAY_IN_MS);
}

function isSameUtcDay(previousValue, nextValue) {
  return getUtcDayDifference(previousValue, nextValue) === 0;
}

function calculateNextMaintenanceStreak(currentStreak = 0, lastMaintenanceDate, now = new Date()) {
  if (!lastMaintenanceDate) {
    return 1;
  }

  const dayDifference = getUtcDayDifference(lastMaintenanceDate, now);

  if (dayDifference === 0) {
    return Math.max(1, Number(currentStreak) || 0);
  }

  if (dayDifference === 1) {
    return Math.max(0, Number(currentStreak) || 0) + 1;
  }

  return 1;
}

function getStreakBonusPercent(streakDays = 0) {
  const effectiveStreakDays = Math.max(0, Number(streakDays) || 0);
  return Math.min(
    Math.max(effectiveStreakDays - 1, 0) * STREAK_INCREMENT_PERCENT,
    MAX_STREAK_BONUS_PERCENT
  );
}

function calculateRestoreAmount(streakDays = 0) {
  const bonusPercent = getStreakBonusPercent(streakDays);
  return roundHealth(BASE_RESTORE_POINTS * (1 + (bonusPercent / 100)));
}

function buildMaintenanceLog({
  previousHealth,
  newHealth,
  xpAwarded = MAINTENANCE_XP,
  expMultiplier = 1,
  xpDelta = xpAwarded,
  date = new Date(),
}) {
  const normalizedPreviousHealth = clampHealth(previousHealth);
  const normalizedNewHealth = clampHealth(newHealth);

  return {
    date,
    previousHealth: normalizedPreviousHealth,
    newHealth: normalizedNewHealth,
    healthRestored: roundHealth(Math.max(0, normalizedNewHealth - normalizedPreviousHealth)),
    xpAwarded,
    expMultiplier,
    xpDelta,
  };
}

function deriveUnlockedBadges({
  existingBadges = [],
  maintenanceCount = 0,
  streakDays = 0,
  activeAssets = [],
}) {
  const existingBadgeSet = new Set(existingBadges);
  const unlockedBadges = [];

  if (maintenanceCount >= 1 && !existingBadgeSet.has(BADGES.FIRST_CLEAN)) {
    unlockedBadges.push(BADGES.FIRST_CLEAN);
  }

  if (streakDays >= 7 && !existingBadgeSet.has(BADGES.SEVEN_DAY_STREAK)) {
    unlockedBadges.push(BADGES.SEVEN_DAY_STREAK);
  }

  const activeAssetHealths = activeAssets
    .map((asset) => Number(asset?.condition?.health ?? asset?.health ?? 0))
    .filter((value) => Number.isFinite(value));
  const hasActiveAssets = activeAssetHealths.length > 0;
  const isPristineCollection = hasActiveAssets && activeAssetHealths.every((value) => value > 90);

  if (isPristineCollection && !existingBadgeSet.has(BADGES.PRISTINE_COLLECTION)) {
    unlockedBadges.push(BADGES.PRISTINE_COLLECTION);
  }

  return unlockedBadges;
}

module.exports = {
  BADGES,
  BASE_DAILY_DECAY,
  BASE_RESTORE_POINTS,
  CATEGORY_MODIFIERS,
  DAY_IN_MS,
  MAINTENANCE_XP,
  MAX_HEALTH,
  MAX_STREAK_BONUS_PERCENT,
  STREAK_INCREMENT_PERCENT,
  buildMaintenanceLog,
  calculateMaintenanceXpAward,
  calculateDailyDecayAmount,
  calculateDecayedHealth,
  calculateNextMaintenanceStreak,
  calculateRestoreAmount,
  clampHealth,
  computeVisualLayersForHealth,
  deriveUnlockedBadges,
  getCategoryModifier,
  getStreakBonusPercent,
  getUtcDayDifference,
  getUtcDayStart,
  isSameUtcDay,
  roundHealth,
};
