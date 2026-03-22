const {
  calculateDailyDecayAmount,
  calculateDecayedHealth,
  computeVisualLayersForHealth,
} = require('../../../src/modules/gamification/gamification.helpers');
const {
  buildDecayUpdate,
  getMillisecondsUntilNextUtcMidnight,
} = require('../../../src/workers/cron.decay');

describe('gamification decay helpers', () => {
  it('applies category modifiers and floors health at zero', () => {
    expect(calculateDailyDecayAmount('sneaker')).toBe(3);
    expect(calculateDailyDecayAmount('lego')).toBe(1.6);
    expect(calculateDailyDecayAmount('camera')).toBe(2.4);
    expect(calculateDailyDecayAmount('other')).toBe(2);

    expect(calculateDecayedHealth(2, 'sneaker')).toBe(0);
    expect(calculateDecayedHealth(50, 'camera')).toBe(47.6);
  });

  it('maps health bands to the correct visual layers', () => {
    expect(computeVisualLayersForHealth(95)).toEqual([]);
    expect(computeVisualLayersForHealth(70)).toEqual(['dust_light']);
    expect(computeVisualLayersForHealth(45)).toEqual(['dust_medium']);
    expect(computeVisualLayersForHealth(25)).toEqual(['dust_heavy']);
    expect(computeVisualLayersForHealth(19)).toEqual(['dust_heavy', 'yellowing']);
  });

  it('builds no decay update for inactive assets', () => {
    expect(buildDecayUpdate({ status: 'draft' })).toBeNull();
  });

  it('builds active-asset decay updates with persisted visual layers', () => {
    const now = new Date('2026-03-22T00:00:00.000Z');
    const operation = buildDecayUpdate({
      _id: 'asset-1',
      status: 'active',
      category: 'camera',
      condition: { health: 21 },
    }, now);

    expect(operation).toEqual({
      updateOne: {
        filter: {
          _id: 'asset-1',
          status: 'active',
        },
        update: {
          $set: {
            'condition.health': 18.6,
            'condition.lastDecayDate': now,
            visualLayers: ['dust_heavy', 'yellowing'],
          },
        },
      },
    });
  });

  it('calculates the delay to the next UTC midnight', () => {
    const now = new Date('2026-03-22T23:59:30.000Z');
    expect(getMillisecondsUntilNextUtcMidnight(now)).toBe(30000);
  });
});
