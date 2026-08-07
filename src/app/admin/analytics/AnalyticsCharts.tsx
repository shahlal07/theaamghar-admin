'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatPKR } from '@/lib/format';
import { EmptyState } from '@/components/admin/EmptyState';
import type { DayOfWeekPoint } from '@/lib/queries/analytics';

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  fontSize: 12,
};

export function DayOfWeekChart({ data }: { data: DayOfWeekPoint[] }) {
  if (data.every((d) => d.orders === 0)) {
    return <EmptyState title="No orders in this range" />;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatPKR(v)} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [formatPKR(Number(value ?? 0)), String(name)]}
        />
        <Bar dataKey="revenue" name="Revenue" fill="#FF6B00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NamedCountChart({
  data,
  color = '#2D5A27',
}: {
  data: { name: string; count: number }[];
  color?: string;
}) {
  if (data.length === 0) {
    return <EmptyState title="No data in this range" />;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" name="Units" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
