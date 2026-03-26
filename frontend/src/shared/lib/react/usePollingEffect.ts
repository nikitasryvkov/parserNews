import { type DependencyList, useEffect, useEffectEvent } from 'react';

export function usePollingEffect(
  effect: () => void | Promise<void>,
  delayMs: number | null,
  deps: DependencyList = [],
): void {
  const runEffect = useEffectEvent(effect);

  useEffect(() => {
    if (delayMs === null) return undefined;

    void runEffect();

    const intervalId = window.setInterval(() => {
      void runEffect();
    }, delayMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [delayMs, runEffect, ...deps]);
}
