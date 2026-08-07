import { requireAdmin } from '@/lib/dal';
import {
  getGiftOrderStats,
  getReferralStats,
  getRedemptionStats,
  getLeaderboardForAdmin,
} from '@/lib/queries/loyalty';
import { formatPKR } from '@/lib/format';
import { LeaderboardManager } from './LeaderboardManager';

export const dynamic = 'force-dynamic';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--text-light)]">{sub}</p>}
    </div>
  );
}

export default async function LoyaltyPage() {
  await requireAdmin();

  const [gifts, referrals, redemptions, leaderboard] = await Promise.all([
    getGiftOrderStats(),
    getReferralStats(),
    getRedemptionStats(),
    getLeaderboardForAdmin(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Rewards & Referrals</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Gift orders, referral conversions, and mango-credit redemptions across the storefront.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Gift Orders" value={String(gifts.totalCount)} sub={formatPKR(gifts.totalValue)} />
        <StatCard
          label="Referral Conversions"
          value={String(referrals.totalConversions)}
          sub={`${referrals.totalReferred} accounts referred · ${referrals.creditsAwarded} credits awarded`}
        />
        <StatCard
          label="Credits Redeemed"
          value={String(redemptions.totalCreditsRedeemed)}
          sub={`${redemptions.totalCount} redemptions`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Top Referrers</h2>
          {referrals.topReferrers.length === 0 ? (
            <p className="text-sm text-[var(--text-light)]">No successful referrals yet.</p>
          ) : (
            <div className="space-y-2">
              {referrals.topReferrers.map((r, i) => (
                <div
                  key={r.name + i}
                  className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0"
                >
                  <span className="text-[var(--text)]">
                    #{i + 1} {r.name}
                  </span>
                  <span className="font-semibold text-[var(--orchard-green)]">{r.conversions} referred</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Recent Redemptions</h2>
          {redemptions.recent.length === 0 ? (
            <p className="text-sm text-[var(--text-light)]">No redemptions yet.</p>
          ) : (
            <div className="space-y-2">
              {redemptions.recent.map((r, i) => (
                <div
                  key={r.couponCode + i}
                  className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0"
                >
                  <div>
                    <p className="text-[var(--text)]">{r.name}</p>
                    <p className="text-xs text-[var(--text-light)]">
                      {r.tier} · {r.couponCode}
                    </p>
                  </div>
                  <span className="font-semibold text-[var(--text)]">-{r.credits}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Manage Leaderboard</h2>
        <p className="mb-3 text-sm text-[var(--text-light)]">
          Adjust a customer&apos;s points (corrections, manual rewards) or remove them from the
          leaderboard entirely.
        </p>
        <LeaderboardManager rows={leaderboard} />
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Recent Gift Orders</h2>
        {gifts.recent.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">No gift orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
                  <th className="pb-2 pr-4">Order</th>
                  <th className="pb-2 pr-4">Recipient</th>
                  <th className="pb-2 pr-4">Message</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {gifts.recent.map((g) => (
                  <tr key={g.orderNumber} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="py-2 pr-4 font-medium text-[var(--text)]">{g.orderNumber}</td>
                    <td className="py-2 pr-4 text-[var(--text)]">{g.recipientName ?? '—'}</td>
                    <td className="py-2 pr-4 max-w-[240px] truncate text-[var(--text-light)]">
                      {g.message ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text)]">{formatPKR(g.total)}</td>
                    <td className="py-2 text-[var(--text-light)]">{g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
