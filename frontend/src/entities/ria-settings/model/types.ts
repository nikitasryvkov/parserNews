export interface RiaSettings {
  lentaPages: number;
  pageDelayMs: number;
  puppeteerSettleMs: number;
}

export interface RiaSettingsResponse {
  ok: boolean;
  settings: RiaSettings;
}

export interface UpdateRiaSettingsPayload {
  lentaPages: number;
  pageDelayMs: number;
  puppeteerSettleMs: number;
}
