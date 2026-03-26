export interface HealthResponse {
  status: 'ok' | 'degraded' | string;
  timestamp: string;
  authRequired: boolean;
  authProvider?: 'api_key' | 'keycloak' | string;
  checks: Record<string, string>;
}
