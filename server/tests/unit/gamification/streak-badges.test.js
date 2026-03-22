const {
  BADGES,
  calculateNextMaintenanceStreak,
  calculateRestoreAmount,
  deriveUnlockedBadges,
  getStreakBonusPercent,
} = require('../../../src/modules/gamification/gamification.helpers');

describe('gamification streak and badge helpers', () => {
  it('advances the global streak across different maintenance days without asset coupling', () => {
    const dayOne = new Date('2026-03-21T09:00:00.000Z');
    const dayTwo = new Date('2026-03-22T11:00:00.000Z');

    expect(calculateNextMaintenanceStreak(0, null, dayOne)).toBe(1);
    expect(calculateNextMaintenanceStreak(1, dayOne, dayTwo)).toBe(2);
    expect(calculateNextMaintenanceStreak(2, dayTwo, dayTwo)).toBe(2);
    expect(calculateNextMaintenanceStreak(5, dayOne, new Date('2026-03-25T00:00:00.000Z'))).toBe(1);
  });

  it('caps streak bonus scaling at 15 percent', () => {
    expect(getStreakBonusPercent(1)).toBe(0);
    expect(getStreakBonusPercent(2)).toBe(5);
    expect(getStreakBonusPercent(3)).toBe(10);
    expect(getStreakBonusPercent(4)).toBe(15);
    expect(getStreakBonusPercent(10)).toBe(15);

    expect(calculateRestoreAmount(1)).toBe(25);
    expect(calculateRestoreAmount(2)).toBe(26.25);
    expect(calculateRestoreAmount(10)).toBe(28.75);
  });

  it('unlocks badges without duplicating prior awards', () => {
    const badges = deriveUnlockedBadges({
      existingBadges: [BADGES.FIRST_CLEAN],
      maintenanceCount: 7,
      streakDays: 7,
      activeAssets: [
        { condition: { health: 95 } },
        { condition: { health: 91 } },
      ],
    });

    expect(badges).toEqual([
      BADGES.SEVEN_DAY_STREAK,
      BADGES.PRISTINE_COLLECTION,
    ]);
  });

  it('requires at least one active asset for pristine collection', () => {
    expect(deriveUnlockedBadges({
      existingBadges: [],
      maintenanceCount: 1,
      streakDays: 1,
      activeAssets: [],
    })).toEqual([BADGES.FIRST_CLEAN]);

    expect(deriveUnlockedBadges({
      existingBadges: [],
      maintenanceCount: 1,
      streakDays: 1,
      activeAssets: [
        { condition: { health: 95 } },
        { condition: { health: 90 } },
      ],
    })).toEqual([BADGES.FIRST_CLEAN]);
  });
});
