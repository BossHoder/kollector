const mongoose = require('mongoose');
const MonthlyUsageCounter = require('../../../src/models/MonthlyUsageCounter');

describe('MonthlyUsageCounter schema', () => {
  it('enforces unique userId + monthKey identity', () => {
    const indexes = MonthlyUsageCounter.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ userId: 1, monthKey: 1 }, expect.objectContaining({ unique: true })],
      ])
    );
  });

  it('initializes usage counters at zero and accepts tier allowance snapshot', () => {
    const doc = new MonthlyUsageCounter({
      userId: new mongoose.Types.ObjectId(),
      monthKey: '2026-04',
      tierAtWindowStart: 'free',
      allowance: 20,
    });

    expect(doc.reservedCount).toBe(0);
    expect(doc.consumedCount).toBe(0);
    expect(doc.releasedCount).toBe(0);
  });

  it('rejects invalid month keys that are not UTC YYYY-MM', async () => {
    const doc = new MonthlyUsageCounter({
      userId: new mongoose.Types.ObjectId(),
      monthKey: '2026-4',
      tierAtWindowStart: 'free',
      allowance: 20,
    });

    await expect(doc.validate()).rejects.toThrow(/monthKey/i);
  });
});
