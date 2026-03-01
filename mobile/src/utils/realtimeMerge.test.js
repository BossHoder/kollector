/**
 * Realtime Merge Utility Tests
 *
 * Tests for debouncing and merging burst realtime events
 */

import {
  createRealtimeMerger,
  mergeAssetUpdates,
  debounceUpdates,
} from './realtimeMerge';

describe('realtimeMerge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createRealtimeMerger', () => {
    it('should create a merger with flush callback', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush);

      expect(typeof merger.add).toBe('function');
      expect(typeof merger.flush).toBe('function');
      expect(typeof merger.clear).toBe('function');
    });

    it('should accumulate updates without immediate flush', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush, { debounceMs: 100 });

      merger.add({ assetId: '1', status: 'active' });
      merger.add({ assetId: '2', status: 'processing' });

      expect(onFlush).not.toHaveBeenCalled();
    });

    it('should flush updates after debounce period', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush, { debounceMs: 100 });

      merger.add({ assetId: '1', status: 'active' });
      merger.add({ assetId: '2', status: 'processing' });

      jest.advanceTimersByTime(100);

      expect(onFlush).toHaveBeenCalledTimes(1);
      expect(onFlush).toHaveBeenCalledWith([
        { assetId: '1', status: 'active' },
        { assetId: '2', status: 'processing' },
      ]);
    });

    it('should merge duplicate asset updates (keep latest)', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush, { debounceMs: 100 });

      merger.add({ assetId: '1', status: 'processing' });
      merger.add({ assetId: '1', status: 'active' });
      merger.add({ assetId: '1', status: 'active', aiMetadata: { brand: 'Nike' } });

      jest.advanceTimersByTime(100);

      expect(onFlush).toHaveBeenCalledWith([
        { assetId: '1', status: 'active', aiMetadata: { brand: 'Nike' } },
      ]);
    });

    it('should reset debounce timer on new update', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush, { debounceMs: 100 });

      merger.add({ assetId: '1', status: 'processing' });

      jest.advanceTimersByTime(50);
      merger.add({ assetId: '2', status: 'active' });

      jest.advanceTimersByTime(50);
      expect(onFlush).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(onFlush).toHaveBeenCalled();
    });

    it('should allow manual flush', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush, { debounceMs: 100 });

      merger.add({ assetId: '1', status: 'active' });
      merger.flush();

      expect(onFlush).toHaveBeenCalled();
    });

    it('should clear pending updates', () => {
      const onFlush = jest.fn();
      const merger = createRealtimeMerger(onFlush, { debounceMs: 100 });

      merger.add({ assetId: '1', status: 'active' });
      merger.clear();

      jest.advanceTimersByTime(100);

      expect(onFlush).not.toHaveBeenCalled();
    });
  });

  describe('mergeAssetUpdates', () => {
    it('should merge array of updates by assetId', () => {
      const updates = [
        { assetId: '1', status: 'processing' },
        { assetId: '2', status: 'active' },
        { assetId: '1', status: 'active' },
      ];

      const merged = mergeAssetUpdates(updates);

      expect(merged).toHaveLength(2);
      expect(merged.find(u => u.assetId === '1').status).toBe('active');
      expect(merged.find(u => u.assetId === '2').status).toBe('active');
    });

    it('should preserve non-overwritten fields', () => {
      const updates = [
        { assetId: '1', status: 'processing', timestamp: '2024-01-01' },
        { assetId: '1', status: 'active' },
      ];

      const merged = mergeAssetUpdates(updates);

      expect(merged[0]).toEqual({
        assetId: '1',
        status: 'active',
        timestamp: '2024-01-01',
      });
    });

    it('should handle empty array', () => {
      const merged = mergeAssetUpdates([]);
      expect(merged).toEqual([]);
    });

    it('should handle single update', () => {
      const updates = [{ assetId: '1', status: 'active' }];
      const merged = mergeAssetUpdates(updates);

      expect(merged).toEqual([{ assetId: '1', status: 'active' }]);
    });
  });

  describe('debounceUpdates', () => {
    it('should debounce rapid calls', () => {
      const callback = jest.fn();
      const debounced = debounceUpdates(callback, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      jest.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('third');
    });

    it('should call immediately on leading edge if configured', () => {
      const callback = jest.fn();
      const debounced = debounceUpdates(callback, 100, { leading: true });

      debounced('first');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should cancel pending calls', () => {
      const callback = jest.fn();
      const debounced = debounceUpdates(callback, 100);

      debounced('value');
      debounced.cancel();

      jest.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should flush pending calls immediately', () => {
      const callback = jest.fn();
      const debounced = debounceUpdates(callback, 100);

      debounced('value');
      debounced.flush();

      expect(callback).toHaveBeenCalledWith('value');
    });
  });
});
