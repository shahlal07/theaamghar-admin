import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp, isIpAllowlisted } from './ip-allowlist';

function requestFrom(ip: string | null) {
  const headers = new Headers();
  if (ip) headers.set('x-forwarded-for', ip);
  return new NextRequest('http://localhost/admin', { headers });
}

describe('getClientIp', () => {
  it('reads the first entry of x-forwarded-for', () => {
    const req = requestFrom('203.0.113.4, 10.0.0.1');
    expect(getClientIp(req)).toBe('203.0.113.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.9' });
    const req = new NextRequest('http://localhost/admin', { headers });
    expect(getClientIp(req)).toBe('198.51.100.9');
  });

  it('returns null with no IP headers at all', () => {
    const req = requestFrom(null);
    expect(getClientIp(req)).toBeNull();
  });
});

describe('isIpAllowlisted', () => {
  const ORIGINAL = process.env.ADMIN_IP_ALLOWLIST;

  beforeEach(() => {
    delete process.env.ADMIN_IP_ALLOWLIST;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_IP_ALLOWLIST;
    else process.env.ADMIN_IP_ALLOWLIST = ORIGINAL;
  });

  it('is a no-op (always allows) when the env var is unset', () => {
    expect(isIpAllowlisted(requestFrom('1.2.3.4'))).toBe(true);
  });

  it('is a no-op when the env var is an empty string', () => {
    process.env.ADMIN_IP_ALLOWLIST = '';
    expect(isIpAllowlisted(requestFrom('1.2.3.4'))).toBe(true);
  });

  it('allows an exact IP match', () => {
    process.env.ADMIN_IP_ALLOWLIST = '203.0.113.4';
    expect(isIpAllowlisted(requestFrom('203.0.113.4'))).toBe(true);
  });

  it('blocks an IP not in the list', () => {
    process.env.ADMIN_IP_ALLOWLIST = '203.0.113.4';
    expect(isIpAllowlisted(requestFrom('203.0.113.5'))).toBe(false);
  });

  it('supports multiple comma-separated entries', () => {
    process.env.ADMIN_IP_ALLOWLIST = '203.0.113.4,198.51.100.9';
    expect(isIpAllowlisted(requestFrom('198.51.100.9'))).toBe(true);
  });

  it('matches a CIDR range', () => {
    process.env.ADMIN_IP_ALLOWLIST = '198.51.100.0/24';
    expect(isIpAllowlisted(requestFrom('198.51.100.200'))).toBe(true);
    expect(isIpAllowlisted(requestFrom('198.51.101.1'))).toBe(false);
  });

  it('blocks when there is no client IP at all', () => {
    process.env.ADMIN_IP_ALLOWLIST = '203.0.113.4';
    expect(isIpAllowlisted(requestFrom(null))).toBe(false);
  });
});
