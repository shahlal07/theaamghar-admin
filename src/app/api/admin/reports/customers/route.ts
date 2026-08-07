import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/dal';
import { getCustomersList } from '@/lib/queries/customers';
import { toCsv, type ReportColumn } from '@/lib/reports/csv';
import { toExcelBuffer } from '@/lib/reports/excel';
import { toPdfBuffer } from '@/lib/reports/pdf';
import type { CustomerListItem } from '@/lib/queries/customers';

export const runtime = 'nodejs';

const COLUMNS: ReportColumn<CustomerListItem>[] = [
  { header: 'Name', value: (r) => r.name ?? 'Unnamed' },
  { header: 'Email', value: (r) => r.email ?? '' },
  { header: 'Phone', value: (r) => r.phone ?? '' },
  { header: 'Orders', value: (r) => r.order_count },
  { header: 'Lifetime Spend (Rs)', value: (r) => r.total_spent },
  {
    header: 'Last Order',
    value: (r) => (r.last_order_at ? new Date(r.last_order_at).toLocaleDateString('en-PK') : ''),
  },
  { header: 'Joined', value: (r) => new Date(r.created_at).toLocaleDateString('en-PK') },
];

export async function GET(request: NextRequest) {
  await getAdminUser();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  const rows = await getCustomersList();
  const filenameBase = `customers-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    const buffer = await toExcelBuffer('Customers', rows, COLUMNS);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  if (format === 'pdf') {
    const buffer = await toPdfBuffer('Customers Report', rows, COLUMNS);
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
