/**
 * Realtime Merge Utility
 *
 * Utilities for debouncing and merging burst realtime events.
 * Prevents UI thrash when multiple asset_processed events arrive rapidly.
 */

/**
 * @typedef {Object} AssetUpdate
 * @property {string} assetId
 * @property {string} [status]
 * @property {Object} [aiMetadata]
 * @property {string} [processedImageUrl]
 * @property {string} [timestamp]
 */

/**
 * @typedef {Object} MergerOptions
 * @property {number} [debounceMs=150] - Debounce period in milliseconds
 */

/**
 * Create a realtime merger for asset updates
 *
 * Accumulates updates, merges duplicates by assetId, and flushes
 * after a debounce period.
 *
 * @param {function(AssetUpdate[]): void} onFlush - Callback when updates are flushed
 * @param {MergerOptions} [options]
 * @returns {{ add: function, flush: function, clear: function }}
 */
export function createRealtimeMerger(onFlush, options = {}) {
  const { debounceMs = 150 } = options;

  /** @type {Map<string, AssetUpdate>} */
  let pendingUpdates = new Map();
  let timeoutId = null;

  /**
   * Add an update to the pending queue
   * @param {AssetUpdate} update
   */
  function add(update) {
    if (!update || !update.assetId) {
      console.warn('realtimeMerger: Invalid update (missing assetId)');
      return;
    }

    // Merge with existing update for same asset
    const existing = pendingUpdates.get(update.assetId);
    if (existing) {
      pendingUpdates.set(update.assetId, { ...existing, ...update });
    } else {
      pendingUpdates.set(update.assetId, update);
    }

    // Reset debounce timer
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      flush();
    }, debounceMs);
  }

  /**
   * Flush all pending updates immediately
   */
  function flush() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (pendingUpdates.size === 0) {
      return;
    }

    const updates = Array.from(pendingUpdates.values());
    pendingUpdates = new Map();

    onFlush(updates);
  }

  /**
   * Clear all pending updates without flushing
   */
  function clear() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingUpdates = new Map();
  }

  return {
    add,
    flush,
    clear,
  };
}

/**
 * Merge an array of asset updates by assetId, keeping latest values
 *
 * @param {AssetUpdate[]} updates
 * @returns {AssetUpdate[]}
 */
export function mergeAssetUpdates(updates) {
  if (!updates || updates.length === 0) {
    return [];
  }

  const mergedMap = new Map();

  for (const update of updates) {
    if (!update || !update.assetId) continue;

    const existing = mergedMap.get(update.assetId);
    if (existing) {
      mergedMap.set(update.assetId, { ...existing, ...update });
    } else {
      mergedMap.set(update.assetId, update);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Deduplicate realtime events by assetId/timestamp/status tuple.
 * Keeps first-seen event ordering while dropping exact duplicates.
 *
 * @param {AssetUpdate[]} events
 * @returns {AssetUpdate[]}
 */
export function dedupeRealtimeEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const seen = new Set();
  const deduped = [];

  for (const event of events) {
    if (!event || !event.assetId) {
      continue;
    }

    const key = `${event.assetId}|${event.timestamp || ''}|${event.status || ''}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(event);
  }

  return deduped;
}

/**
 * @typedef {Object} DebounceOptions
 * @property {boolean} [leading=false] - Call on leading edge
 * @property {boolean} [trailing=true] - Call on trailing edge
 */

/**
 * Create a debounced function
 *
 * @param {function} callback
 * @param {number} wait - Debounce wait in ms
 * @param {DebounceOptions} [options]
 * @returns {function & { cancel: function, flush: function }}
 */
export function debounceUpdates(callback, wait, options = {}) {
  const { leading = false, trailing = true } = options;

  let timeoutId = null;
  let lastArgs = null;
  let lastCallTime = null;
  let result = null;

  function invokeCallback() {
    const args = lastArgs;
    lastArgs = null;
    result = callback(args);
    return result;
  }

  function debounced(...args) {
    lastArgs = args[0];
    lastCallTime = Date.now();

    const isFirstCall = timeoutId === null;

    if (isFirstCall && leading) {
      result = invokeCallback();
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs !== null) {
        invokeCallback();
      }
    }, wait);

    return result;
  }

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs !== null) {
      return invokeCallback();
    }
    return result;
  };

  return debounced;
}

export default {
  createRealtimeMerger,
  mergeAssetUpdates,
  dedupeRealtimeEvents,
  debounceUpdates,
};
