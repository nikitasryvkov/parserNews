import { requestJson } from '../../../shared/api/http/client';
import type { HealthResponse } from '../model/types';

export function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health', {
    throwOnHttpError: false,
  });
}
