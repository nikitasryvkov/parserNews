import { requestJson } from '../../../shared/api/http/client';
import type { RiaSettingsResponse, UpdateRiaSettingsPayload } from '../model/types';

export function fetchRiaSettings(): Promise<RiaSettingsResponse> {
  return requestJson<RiaSettingsResponse>('/settings/ria');
}

export function updateRiaSettings(payload: UpdateRiaSettingsPayload): Promise<RiaSettingsResponse> {
  return requestJson<RiaSettingsResponse>('/settings/ria', {
    method: 'PATCH',
    body: payload,
  });
}
