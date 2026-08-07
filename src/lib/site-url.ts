// Mirrors the storefront's src/lib/site-url.ts. Every customer-facing
// absolute URL this app emits (order status emails, payment
// approved/rejected emails) points at the STOREFRONT, not the admin panel,
// so it reads NEXT_PUBLIC_SITE_URL -- switching to a real domain later is
// one env var rather than a find-replace.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://theaamghar-web.vercel.app'
).replace(/\/$/, '');
