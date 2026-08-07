import { getAnalyticsData } from '@/lib/queries/analytics';
import { formatPKR, formatPercent } from '@/lib/format';
import { StatCard } from '@/components/admin/StatCard';
import { RevenueTrendChart, CityBarChart } from '@/components/admin/DashboardCharts';
import { DayOfWeekChart, NamedCountChart } from './AnalyticsCharts';
import { DateRangeFilter } from './DateRangeFilter';

export const dynamic = 'force-dynamic';

function changeHint(pct: number | null): string | undefined {
  if (pct === null) return 'no data in prior period';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${formatPercent(pct)} vs previous period`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);
  const toExclusive = new Date(toDate.getTime() + 1);

  const fromDate = from ? new Date(from) : new Date(toDate);
  if (!from) fromDate.setDate(fromDate.getDate() - 30);
  fromDate.setHours(0, 0, 0, 0);

  const data = await getAnalyticsData(fromDate, toExclusive);

  const cityData = data.topCities.map((c) => ({ city: c.name, orders: c.count }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Analytics</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Deep-dive metrics for a custom date range, compared to the equivalent prior period.
      </p>

      <DateRangeFilter
        from={fromDate.toISOString().slice(0, 10)}
        to={to ?? new Date().toISOString().slice(0, 10)}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPKR(data.revenue)}
          hint={changeHint(data.revenueChangePercent)}
          accent="orange"
        />
        <StatCard
          label="Profit"
          value={formatPKR(data.profit)}
          hint={changeHint(data.profitChangePercent)}
          accent="green"
        />
        <StatCard
          label="Orders"
          value={String(data.orderCount)}
          hint={changeHint(data.orderCountChangePercent)}
          accent="blue"
        />
        <StatCard
          label="Avg. Order Value"
          value={formatPKR(data.averageOrderValue)}
          hint={changeHint(data.aovChangePercent)}
          accent="gold"
        />
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Revenue & Profit Trend</h2>
        <RevenueTrendChart data={data.dailySeries} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Revenue by Day of Week</h2>
          <DayOfWeekChart data={data.dayOfWeek} />
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Orders by City</h2>
          <CityBarChart data={cityData} />
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Top Products (units)</h2>
          <NamedCountChart data={data.topProducts} color="#FF6B00" />
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Top Varieties (units)</h2>
          <NamedCountChart data={data.topVarieties} color="#2D5A27" />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Payment Methods</h2>
        {data.paymentMethodSplit.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">No orders in this range.</p>
        ) : (
          <div className="space-y-2">
            {data.paymentMethodSplit.map((p) => (
              <div
                key={p.method}
                className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0"
              >
                <span className="text-[var(--text)] uppercase">{p.method}</span>
                <span className="text-[var(--text-light)]">{p.count} orders</span>
                <span className="text-[var(--text)]">{formatPKR(p.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
