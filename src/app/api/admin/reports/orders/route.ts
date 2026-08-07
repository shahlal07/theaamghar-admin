import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { toCsv, type ReportColumn } from '@/lib/reports/csv';
import { toExcelBuffer } from '@/lib/reports/excel';
import { toPdfBuffer } from '@/lib/reports/pdf';

export const runtime = 'nodejs';

type ReportOrder = {
  order_number: string;
  customer_name: string;
  city: string;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
};

const COLUMNS: ReportColumn<ReportOrder>[] = [
  { header: 'Order #', value: (r) => r.order_number },
  { header: 'Customer', value: (r) => r.customer_name },
  { header: 'City', value: (r) => r.city },
  { header: 'Total (Rs)', value: (r) => r.total },
  { header: 'Status', value: (r) => r.status },
  { header: 'Payment Status', value: (r) => r.payment_status ?? '' },
  { header: 'Payment Method', value: (r) => r.payment_method ?? '' },
  { header: 'Placed At', value: (r) => new Date(r.created_at).toLocaleString('en-PK') },
];

export async function GET(request: NextRequest) {
  await getAdminUser();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('order_number, delivery, total, status, payment_status, payment_method, created_at')
    .order('created_at', { ascending: false })
    // Circuit-breaker, not a real limit at today's volume -- degrades
    // gracefully instead of an unbounded export failing outright.
    .limit(10000);

  if (from) query = query.gte('created_at', new Date(from).toISOString());
  if (to) {
    const toExclusive = new Date(to);
    toExclusive.setDate(toExclusive.getDate() + 1);
    query = query.lt('created_at', toExclusive.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: ReportOrder[] = (data ?? []).map((o) => ({
    order_number: o.order_number,
    customer_name: (o.delivery as { full_name?: string } | null)?.full_name ?? 'Unknown',
    city: (o.delivery as { city?: string } | null)?.city ?? '',
    total: o.total,
    status: o.status,
    payment_status: o.payment_status,
    payment_method: o.payment_method,
    created_at: o.created_at,
  }));

  const filenameBase = `orders-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    const buffer = await toExcelBuffer('Orders', rows, COLUMNS);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  if (format === 'pdf') {
    const buffer = await toPdfBuffer('Orders Report', rows, COLUMNS);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    });
  }

  const csv = toCsv(rows, COLUMNS);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
