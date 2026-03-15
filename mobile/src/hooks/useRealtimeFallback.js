import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_INTERVAL_MS = 12000;

export function useRealtimeFallback({
  isConnected,
  onPoll,
  onReconnect,
  intervalMs = DEFAULT_INTERVAL_MS,
}) {
  const intervalRef = useRef(null);
  const prevConnectedRef = useRef(isConnected);
  const [lastPolledAt, setLastPolledAt] = useState(null);

  useEffect(() => {
    if (isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (prevConnectedRef.current === false) {
        onReconnect?.();
      }
      prevConnectedRef.current = true;
      return;
    }

    prevConnectedRef.current = false;

    if (intervalRef.current) {
      return;
    }

    intervalRef.current = setInterval(async () => {
      await onPoll?.();
      setLastPolledAt(Date.now());
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isConnected, intervalMs, onPoll, onReconnect]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return useMemo(() => ({
    isFallbackActive: !isConnected,
    lastPolledAt,
  }), [isConnected, lastPolledAt]);
}

export default useRealtimeFallback;
