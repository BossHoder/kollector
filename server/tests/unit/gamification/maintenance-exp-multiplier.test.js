const { calculateMaintenanceXpAward } = require('../../../src/modules/gamification/gamification.helpers');

describe('maintenance EXP multiplier', () => {
  it('awards base EXP for Free users', () => {
    expect(calculateMaintenanceXpAward(1)).toBe(10);
  });

  it('awards 3x EXP for VIP users', () => {
    expect(calculateMaintenanceXpAward(3)).toBe(30);
  });
});
