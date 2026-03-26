import { useState } from 'react';
import { fetchHealth } from '../../../entities/health/api/healthApi';
import type { HealthResponse } from '../../../entities/health/model/types';
import { POLLING_INTERVALS } from '../../../shared/config/constants';
import { usePollingEffect } from '../../../shared/lib/react/usePollingEffect';

export interface HealthState extends HealthResponse {
  loading: boolean;
  error: string;
}

const INITIAL_HEALTH_STATE: HealthState = {
  status: 'unknown',
  timestamp: '',
  authRequired: false,
  checks: {},
  loading: true,
  error: '',
};

export function useHealthStatus(reloadKey: number) {
  const [health, setHealth] = useState<HealthState>(INITIAL_HEALTH_STATE);

  usePollingEffect(
    async () => {
      try {
        const response = await fetchHealth();
        setHealth({
          ...response,
          loading: false,
          error: '',
        });
      } catch (error) {
        setHealth((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Не удалось получить health status',
        }));
      }
    },
    POLLING_INTERVALS.health,
    [reloadKey],
  );

  return health;
}
