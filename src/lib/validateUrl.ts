import { createChildLogger } from './logger.js';

const log = createChildLogger('validateUrl');

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Validates that a URL is safe to fetch (no SSRF).
 * Rejects file://, private IPs, localhost, etc.
 */
export function isSafeUrl(raw: string): boolean {
  try {
    const url = new URL(raw);

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      log.warn({ url: raw, protocol: url.protocol }, 'blocked non-http protocol');
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '') {
      log.warn({ url: raw }, 'blocked localhost');
      return false;
    }

    for (const re of PRIVATE_IP_RANGES) {
      if (re.test(hostname)) {
        log.warn({ url: raw }, 'blocked private IP');
        return false;
      }
    }

    return true;
  } catch {
    log.warn({ url: raw }, 'blocked malformed URL');
    return false;
  }
}
