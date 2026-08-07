import { SITE_URL } from '@/lib/site-url';
import { getBusinessSettings } from '@/lib/queries/settings';
import { getPaymentAccounts } from '@/lib/queries/payment-accounts';
import { requireAdmin } from '@/lib/dal';
import { SettingsClient } from './SettingsClient';
import { PaymentAccountsClient } from './PaymentAccountsClient';
import { MfaClient } from './MfaClient';
import { AccountSecurityClient } from './AccountSecurityClient';
import { listMfaFactors } from './mfa-actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const admin = await requireAdmin();

  const [settings, paymentAccounts, mfaFactors] = await Promise.all([
    getBusinessSettings(),
    getPaymentAccounts(),
    listMfaFactors(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Settings</h1>
          <p className="text-sm text-[var(--text-light)]">
            The single source of truth every other module reads defaults from.
          </p>
        </div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
        >
          🔗 View Store
        </a>
      </div>
      <div className="space-y-6">
        <AccountSecurityClient currentEmail={admin.email} />
        <SettingsClient settings={settings} />
        <PaymentAccountsClient accounts={paymentAccounts} />
        <MfaClient initialFactors={mfaFactors} />
      </div>
    </div>
  );
}
