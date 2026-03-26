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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeChecks(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
  );
}

function normalizeHealthResponse(value: unknown): HealthResponse {
  if (!isRecord(value)) {
    throw new Error('Не удалось получить health status');
  }

  if (typeof value.error === 'string' && value.error.trim()) {
    throw new Error(value.error);
  }

  if (typeof value.status !== 'string') {
    throw new Error('Сервер вернул некорректный health status');
  }

  return {
    status: value.status,
    timestamp: typeof value.timestamp === 'string' ? value.timestamp : '',
    authRequired: Boolean(value.authRequired),
    authProvider: typeof value.authProvider === 'string' ? value.authProvider : undefined,
    checks: normalizeChecks(value.checks),
  };
}

export function useHealthStatus(reloadKey: number) {
  const [health, setHealth] = useState<HealthState>(INITIAL_HEALTH_STATE);

  usePollingEffect(
    async () => {
      try {
        const response = normalizeHealthResponse(await fetchHealth());
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
