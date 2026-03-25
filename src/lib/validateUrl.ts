import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { createChildLogger } from './logger.js';

const log = createChildLogger('validateUrl');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const BLOCKED_HOST_SUFFIXES = ['.internal', '.local', '.home.arpa'];

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

function normalizeIpAddress(ip: string): string {
  const zoneIndex = ip.indexOf('%');
  const withoutZone = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);
  const lower = withoutZone.toLowerCase();
  return lower.startsWith('::ffff:') ? lower.slice(7) : lower;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number.parseInt(part, 10));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return (((nums[0] * 256 + nums[1]) * 256 + nums[2]) * 256 + nums[3]) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true;

  return (
    value <= 0x00ffffff ||
    (value >= 0x0a000000 && value <= 0x0affffff) ||
    (value >= 0x64400000 && value <= 0x647fffff) ||
    (value >= 0x7f000000 && value <= 0x7fffffff) ||
    (value >= 0xa9fe0000 && value <= 0xa9feffff) ||
    (value >= 0xac100000 && value <= 0xac1fffff) ||
    (value >= 0xc0a80000 && value <= 0xc0a8ffff) ||
    (value >= 0xc6120000 && value <= 0xc613ffff) ||
    value >= 0xe0000000
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = normalizeIpAddress(ip);
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('2001:db8:')
  );
}

function isPrivateIpAddress(ip: string): boolean {
  const normalized = normalizeIpAddress(ip);
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version === 6) return isPrivateIpv6(normalized);
  return true;
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [normalizeIpAddress(hostname)];
  const records = await lookup(hostname, { all: true, verbatim: true });
  return [...new Set(records.map((record) => normalizeIpAddress(record.address)))];
}

/**
 * Validates that a URL is safe to fetch (no SSRF).
 * Rejects non-http protocols, URL credentials, localhost, and hosts that
 * resolve to private/reserved IP ranges.
 */
export async function isSafeUrl(raw: string): Promise<boolean> {
  try {
    const url = new URL(raw);

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      log.warn({ url: raw, protocol: url.protocol }, 'blocked non-http protocol');
      return false;
    }

    if (url.username || url.password) {
      log.warn({ url: raw }, 'blocked URL with credentials');
      return false;
    }

    const hostname = normalizeHostname(url.hostname);
    if (hostname === 'localhost' || hostname === '') {
      log.warn({ url: raw }, 'blocked localhost');
      return false;
    }

    if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
      log.warn({ url: raw, hostname }, 'blocked internal hostname');
      return false;
    }

    const addresses = await resolveHostAddresses(hostname);
    if (addresses.length === 0) {
      log.warn({ url: raw, hostname }, 'blocked unresolved hostname');
      return false;
    }

    if (addresses.some((ip) => isPrivateIpAddress(ip))) {
      log.warn({ url: raw, hostname, addresses }, 'blocked private or reserved IP');
      return false;
    }

    return true;
  } catch (err) {
    log.warn({ url: raw, err }, 'blocked malformed or unresolvable URL');
    return false;
  }
}
