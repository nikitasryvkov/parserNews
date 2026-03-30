import { type DependencyList, useEffect, useEffectEvent, useRef } from 'react';

export function usePollingEffect(
  effect: () => void | Promise<void>,
  delayMs: number | null,
  deps: DependencyList = [],
): void {
  const isRunningRef = useRef(false);
  const runEffect = useEffectEvent(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;

    try {
      await effect();
    } finally {
      isRunningRef.current = false;
    }
  });

  useEffect(() => {
    if (delayMs === null) return undefined;

    void runEffect();

    const intervalId = window.setInterval(() => {
      void runEffect();
    }, delayMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [delayMs, ...deps]);
}
