import 'server-only';
import nodemailer from 'nodemailer';
import { formatPKR } from '@/lib/format';
import { SITE_URL } from '@/lib/site-url';

// Same Gmail-SMTP-via-App-Password approach as the storefront's
// lib/email.ts (not a transactional email API/service, per the site
// owner's choice) -- this app sends its own separate set of emails
// (order status changes, payment verification outcomes) using its own
// GMAIL_USER/GMAIL_APP_PASSWORD env vars. No-ops with a console warning
// when unset so an admin action never fails just because email isn't
// configured.
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

// A crude but effective HTML->text derivation -- an HTML-only email (no
// text/plain part) is one of the strongest signals spam filters use against
// automated mail, and every email this module sends was missing one
// entirely until now. Good enough for these short, simple templates; not
// meant to handle arbitrary HTML. Mirrors the storefront's copy in its own
// lib/email.ts -- keep both in sync if this ever needs to change.
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&(lt|gt|quot|#39);/g, (m) => ({ '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[m] ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Best-effort: a failed send must never fail the admin action (status
// update / payment verification) that already succeeded in the database.
async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter || !GMAIL_USER) {
    console.warn(`[email] Skipped "${subject}" to ${to} -- GMAIL_USER/GMAIL_APP_PASSWORD not set.`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"TheAamGhar" <${GMAIL_USER}>`,
      to,
      subject,
      text: htmlToText(html),
      html,
    });
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
  }
}

function wrapEmail(bodyHtml: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#FF6B00;padding:20px 24px;border-radius:12px 12px 0 0;">
        <span style="color:#fff;font-size:20px;font-weight:700;">TheAamGhar</span>
      </div>
      <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:24px;color:#2D2D2D;">
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
        TheAamGhar — Premium Pakistani Mangoes
      </p>
    </div>
  `;
}

const STATUS_COPY: Record<string, { emoji: string; message: string }> = {
  confirmed: { emoji: '✅', message: 'Your order is confirmed and headed to our packing table.' },
  packed: { emoji: '📦', message: 'Your mangoes are packed and waiting for pickup.' },
  shipped: { emoji: '🚚', message: 'Your order is on its way!' },
  delivered: { emoji: '🥭', message: 'Delivered — enjoy your mangoes!' },
  cancelled: { emoji: '❌', message: 'Your order has been cancelled.' },
  refunded: { emoji: '↩️', message: 'Your order has been refunded.' },
};

export async function sendOrderStatusUpdateEmail(params: {
  to: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
  courierName?: string | null;
}): Promise<void> {
  const copy = STATUS_COPY[params.status];
  if (!copy) return; // pending has no customer-facing email -- nothing changed from their view yet

  const trackUrl = `${SITE_URL}/track?order=${params.orderNumber}`;
  const trackingLine =
    params.trackingNumber && params.status === 'shipped'
      ? `<p><strong>Tracking:</strong> ${params.trackingNumber}${params.courierName ? ` via ${params.courierName}` : ''}</p>`
      : '';

  const html = wrapEmail(`
    <h2 style="margin-top:0;">${copy.emoji} Order ${params.orderNumber}</h2>
    <p>${copy.message}</p>
    ${trackingLine}
    <a href="${trackUrl}" style="display:inline-block;margin-top:16px;background:#FF6B00;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;">Track Your Order</a>
  `);
  await sendMail(params.to, `Order ${params.orderNumber} — ${copy.message}`, html);
}

export async function sendAnnouncementEmail(params: {
  to: string;
  title: string;
  message: string;
}): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">${params.title}</h2>
    <p style="white-space:pre-wrap;">${params.message}</p>
    <a href="${SITE_URL}" style="display:inline-block;margin-top:16px;background:#FF6B00;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;">Shop Now</a>
  `);
  await sendMail(params.to, params.title, html);
}

export async function sendPaymentApprovedEmail(params: {
  to: string;
  orderNumber: string;
  total: number;
}): Promise<void> {
  const trackUrl = `${SITE_URL}/track?order=${params.orderNumber}`;
  const html = wrapEmail(`
    <h2 style="margin-top:0;">✅ Payment Verified</h2>
    <p>We've confirmed your ${formatPKR(params.total)} payment for order <strong>${params.orderNumber}</strong> — it's now headed through our kitchen and packing.</p>
    <a href="${trackUrl}" style="display:inline-block;margin-top:16px;background:#FF6B00;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;">Track Your Order</a>
  `);
  await sendMail(params.to, `Payment Verified — ${params.orderNumber}`, html);
}

export async function sendPaymentRejectedEmail(params: {
  to: string;
  orderNumber: string;
  reason: string;
}): Promise<void> {
  const trackUrl = `${SITE_URL}/track?order=${params.orderNumber}`;
  const html = wrapEmail(`
    <h2 style="margin-top:0;color:#c0392b;">We couldn't verify this payment</h2>
    <p>For order <strong>${params.orderNumber}</strong>:</p>
    <p style="background:#fdf0ef;border-radius:8px;padding:12px 16px;">${params.reason}</p>
    <p>Please visit your tracking page to re-upload your payment proof, or reach out to us on WhatsApp.</p>
    <a href="${trackUrl}" style="display:inline-block;margin-top:16px;background:#FF6B00;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;">Go to Order</a>
  `);
  await sendMail(params.to, `Action Needed — Payment for ${params.orderNumber}`, html);
}
