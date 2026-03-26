let accessToken = '';

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string | null | undefined): void {
  accessToken = token?.trim() || '';
}

export function clearAccessToken(): void {
  accessToken = '';
}
