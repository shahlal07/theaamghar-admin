'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import type { BusinessSettings } from '@/lib/queries/settings';
import { updateBusinessSettings } from './actions';

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SettingsClient({ settings }: { settings: BusinessSettings }) {
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [currency, setCurrency] = useState(settings.currency);
  const [paymentGatewayFeePercent, setPaymentGatewayFeePercent] = useState(
    settings.payment_gateway_fee_percent
  );
  const [taxPercent, setTaxPercent] = useState(settings.tax_percent);
  const [defaultShippingCost, setDefaultShippingCost] = useState(settings.default_shipping_cost);
  const [lowStockAlertThreshold, setLowStockAlertThreshold] = useState(
    settings.low_stock_alert_threshold
  );
  const [supportPhone, setSupportPhone] = useState(settings.support_phone ?? '');
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? '');
  const [supportWhatsapp, setSupportWhatsapp] = useState(settings.support_whatsapp ?? '');
  const [whatsappOrderMessageTemplate, setWhatsappOrderMessageTemplate] = useState(
    settings.whatsapp_order_message_template ?? ''
  );
  const [businessAddress, setBusinessAddress] = useState(settings.business_address ?? '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(settings.google_maps_url ?? '');
  const [facebookUrl, setFacebookUrl] = useState(settings.facebook_url ?? '');
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(settings.tiktok_url ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(settings.youtube_url ?? '');
  const [twitterUrl, setTwitterUrl] = useState(settings.twitter_url ?? '');
  const [welcomeDiscountPercent, setWelcomeDiscountPercent] = useState(
    settings.welcome_discount_percent
  );
  const [welcomeDiscountEnabled, setWelcomeDiscountEnabled] = useState(
    settings.welcome_discount_enabled
  );
  const [codEnabled, setCodEnabled] = useState(settings.cod_enabled);

  const [state, formAction, pending] = useActionState(updateBusinessSettings, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Settings saved');
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={(fd) => {
        fd.set('businessName', businessName);
        fd.set('currency', currency);
        fd.set('paymentGatewayFeePercent', String(paymentGatewayFeePercent));
        fd.set('taxPercent', String(taxPercent));
        fd.set('defaultShippingCost', String(defaultShippingCost));
        fd.set('lowStockAlertThreshold', String(lowStockAlertThreshold));
        fd.set('supportPhone', supportPhone);
        fd.set('supportEmail', supportEmail);
        fd.set('supportWhatsapp', supportWhatsapp);
        fd.set('whatsappOrderMessageTemplate', whatsappOrderMessageTemplate);
        fd.set('businessAddress', businessAddress);
        fd.set('googleMapsUrl', googleMapsUrl);
        fd.set('facebookUrl', facebookUrl);
        fd.set('instagramUrl', instagramUrl);
        fd.set('tiktokUrl', tiktokUrl);
        fd.set('youtubeUrl', youtubeUrl);
        fd.set('twitterUrl', twitterUrl);
        fd.set('welcomeDiscountPercent', String(welcomeDiscountPercent));
        fd.set('welcomeDiscountEnabled', String(welcomeDiscountEnabled));
        fd.set('codEnabled', String(codEnabled));
        formAction(fd);
      }}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Business</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Currency">
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Business address">
              <input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Google Maps link">
              <input
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--text-light)]">
                Share your location from Google Maps and paste the link here. Shown with an embedded map on your storefront&apos;s &ldquo;Find Us&rdquo; section once both this and the address above are set.
              </p>
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Financial Defaults</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Payment gateway fee (%)">
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={paymentGatewayFeePercent}
              onChange={(e) => setPaymentGatewayFeePercent(parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Sales tax (%)">
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Default shipping cost (Rs)">
            <input
              type="number"
              min={0}
              step="1"
              value={defaultShippingCost}
              onChange={(e) => setDefaultShippingCost(parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-[var(--text-light)]">
          The default shipping cost is only used where a province has no explicit rate set on the{' '}
          <a href="/admin/shipping" className="underline">
            Shipping
          </a>{' '}
          page.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Inventory</h2>
        <Field label="Default low-stock alert threshold">
          <input
            type="number"
            min={0}
            step="1"
            value={lowStockAlertThreshold}
            onChange={(e) => setLowStockAlertThreshold(parseInt(e.target.value, 10) || 0)}
            className={`${inputClass} max-w-xs`}
          />
        </Field>
        <p className="mt-2 text-xs text-[var(--text-light)]">
          Used by low-stock notifications. Each box size can still override this individually in{' '}
          <a href="/admin/inventory" className="underline">
            Inventory
          </a>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Contact Info</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Support phone">
            <input
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Support email">
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Support WhatsApp">
            <input
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={'"Order via WhatsApp" message'}>
              <textarea
                value={whatsappOrderMessageTemplate}
                onChange={(e) => setWhatsappOrderMessageTemplate(e.target.value)}
                placeholder="Hi! I'd like to order {product}. Is it available?"
                rows={2}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--text-light)]">
                Pre-filled text on every &quot;Order via WhatsApp&quot; button on your storefront. Use{' '}
                <code className="rounded bg-[var(--surface-sunken)] px-1">{'{product}'}</code> and{' '}
                <code className="rounded bg-[var(--surface-sunken)] px-1">{'{size}'}</code> as placeholders. Leave
                blank to use the default message.
              </p>
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Payment Methods</h2>
        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={codEnabled}
            onChange={(e) => setCodEnabled(e.target.checked)}
          />
          Cash on Delivery
        </label>
        <p className="mt-2 text-xs text-[var(--text-light)]">
          Turning this off removes Cash on Delivery from checkout on your storefront — customers
          will only see Bank/Easypaisa/JazzCash transfer (whichever you have active accounts for).
          If you have no manual payment accounts set up either, checkout has no payment method
          available, so leave this on until you&apos;ve added at least one.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Welcome Offer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount for verifying email (%)">
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={welcomeDiscountPercent}
              onChange={(e) => setWelcomeDiscountPercent(parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={welcomeDiscountEnabled}
              onChange={(e) => setWelcomeDiscountEnabled(e.target.checked)}
            />
            Offer enabled
          </label>
        </div>
        <p className="mt-3 text-xs text-[var(--text-light)]">
          Granted once, automatically, when a new customer verifies their email address on the
          storefront. Changing this percent only affects customers who verify afterward — it
          doesn&apos;t change discounts already granted.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Social Media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook URL">
            <input
              type="url"
              placeholder="https://facebook.com/theaamghar"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Instagram URL">
            <input
              type="url"
              placeholder="https://instagram.com/theaamghar"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="TikTok URL">
            <input
              type="url"
              placeholder="https://tiktok.com/@theaamghar"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="YouTube URL">
            <input
              type="url"
              placeholder="https://youtube.com/@theaamghar"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="X (Twitter) URL">
            <input
              type="url"
              placeholder="https://x.com/theaamghar"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-[var(--text-light)]">
          Leave any of these blank to hide that icon on the storefront footer once it reads from
          these settings.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--mango-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
