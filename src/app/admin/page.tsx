import { getDashboardData } from '@/lib/queries/dashboard';
import { StatCard } from '@/components/admin/StatCard';
import {
  RevenueTrendChart,
  SalesBarChart,
  CityBarChart,
  QtyBarChart,
} from '@/components/admin/DashboardCharts';
import { formatPKR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-light)]">
          Last 365 days · live from your Supabase orders
        </p>
      </div>

      <section>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total Revenue" value={formatPKR(d.totalRevenue)} accent="orange" />
          <StatCard label="Total Profit" value={formatPKR(d.totalProfit)} accent="green" />
          <StatCard label="Total Orders" value={d.totalOrders.toLocaleString()} accent="blue" />
          <StatCard
            label="Avg. Order Value"
            value={formatPKR(d.averageOrderValue)}
            accent="gold"
          />
          <StatCard label="Pending" value={d.statusCounts.pending.toString()} />
          <StatCard label="Confirmed" value={d.statusCounts.confirmed.toString()} />
          <StatCard label="Packed" value={d.statusCounts.packed.toString()} />
          <StatCard label="Shipped" value={d.statusCounts.shipped.toString()} />
          <StatCard label="Delivered" value={d.statusCounts.delivered.toString()} accent="green" />
          <StatCard label="Cancelled" value={d.statusCounts.cancelled.toString()} accent="red" />
          <StatCard label="Refunded" value={d.statusCounts.refunded.toString()} accent="red" />
          <StatCard
            label="Conversion Rate"
            value="—"
            hint="Needs traffic tracking (not wired up yet)"
          />
          <StatCard
            label="COD Pending"
            value={`${d.codPendingCount} · ${formatPKR(d.codPendingAmount)}`}
          />
          <StatCard
            label="COD Received"
            value={`${d.codReceivedCount} · ${formatPKR(d.codReceivedAmount)}`}
            accent="green"
          />
          <StatCard label="New Customers" value={d.newCustomers.toString()} accent="blue" />
          <StatCard
            label="Returning Customers"
            value={d.returningCustomers.toString()}
            accent="green"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">
          Revenue &amp; Profit Trend
        </h2>
        <RevenueTrendChart data={d.dailySeries} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Daily Sales</h2>
          <SalesBarChart data={d.dailySeries} />
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Weekly Sales</h2>
          <SalesBarChart data={d.weeklySeries} />
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Monthly Sales</h2>
          <SalesBarChart data={d.monthlySeries} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Orders by City</h2>
          <CityBarChart data={d.ordersByCity} />
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">
            Best-Selling Variety
          </h2>
          <QtyBarChart data={d.bestSellingVariety} dataKey="variety" color="#2D5A27" />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Best-Selling Product</h2>
        <QtyBarChart data={d.bestSellingProduct} dataKey="name" color="#FF6B00" />
      </section>
    </div>
  );
}
