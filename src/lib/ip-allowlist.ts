import type { NextRequest } from 'next/server';

// Off by default: only enforced when ADMIN_IP_ALLOWLIST is set in the
// environment. Comma-separated list of exact IPv4/IPv6 addresses and/or
// IPv4 CIDR ranges, e.g. "203.0.113.4,198.51.100.0/24". Deliberately an env
// var (not a business_settings row) so it can't be loosened from inside a
// compromised admin session, and so proxy.ts doesn't need a DB round trip
// on every request.
function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) | octet;
  }
  return n >>> 0;
}

function matchesEntry(ip: string, entry: string): boolean {
  if (entry === ip) return true;

  if (entry.includes('/')) {
    const [range, prefixStr] = entry.split('/');
    const prefix = Number(prefixStr);
    const rangeInt = ipv4ToInt(range);
    const ipInt = ipv4ToInt(ip);
    if (rangeInt === null || ipInt === null || !Number.isInteger(prefix)) return false;
    if (prefix === 0) return true;
    const mask = prefix >= 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0;
    return (rangeInt & mask) === (ipInt & mask);
  }

  return false;
}

/**
 * Best-effort client IP from the headers a platform like Vercel sets on the
 * edge request. The first entry in x-forwarded-for is the original client.
 */
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

export function isIpAllowlisted(request: NextRequest): boolean {
  const allowlist = parseAllowlist(process.env.ADMIN_IP_ALLOWLIST);
  if (allowlist.length === 0) return true; // feature disabled

  const ip = getClientIp(request);
  if (!ip) return false;

  return allowlist.some((entry) => matchesEntry(ip, entry));
}
