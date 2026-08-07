'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { SeriesPoint } from '@/lib/queries/dashboard';
import { formatPKR } from '@/lib/format';
import { EmptyState } from './EmptyState';

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  fontSize: 12,
};

export function RevenueTrendChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No sales yet"
        description="Once orders start coming in, revenue and profit trends will appear here."
      />
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatPKR(v)} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [formatPKR(Number(value ?? 0)), String(name)]}
        />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#FF6B00" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="profit" name="Profit" stroke="#2D5A27" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SalesBarChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="No sales yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatPKR(v)} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => formatPKR(Number(value ?? 0))}
        />
        <Bar dataKey="revenue" name="Sales" fill="#FF6B00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function QtyBarChart({
  data,
  dataKey,
  color = '#2D5A27',
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No sales yet"
        description="Best sellers will show up here once orders start coming in."
      />
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey={dataKey} tick={{ fontSize: 11 }} width={100} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="qty" name="Units sold" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CityBarChart({ data }: { data: { city: string; orders: number }[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No delivery cities yet"
        description="City breakdown appears once orders start including delivery addresses."
      />
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={90} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="orders" name="Orders" fill="#3A7A33" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
