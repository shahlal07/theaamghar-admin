import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/dal';
import { getProductsList } from '@/lib/queries/products';
import { toCsv, type ReportColumn } from '@/lib/reports/csv';
import { toExcelBuffer } from '@/lib/reports/excel';
import { toPdfBuffer } from '@/lib/reports/pdf';
import type { ProductListItem } from '@/lib/queries/products';

export const runtime = 'nodejs';

const COLUMNS: ReportColumn<ProductListItem>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Slug', value: (r) => r.slug },
  { header: 'Category', value: (r) => r.category_name ?? '' },
  { header: 'Price (Rs)', value: (r) => r.price ?? '' },
  { header: 'Unit', value: (r) => r.unit ?? '' },
  { header: 'Box Sizes', value: (r) => r.box_size_count },
  { header: 'Total Stock', value: (r) => r.total_stock },
  { header: 'Seasonal', value: (r) => (r.is_seasonal ? 'Yes' : 'No') },
  { header: 'Status', value: (r) => r.status },
];

export async function GET(request: NextRequest) {
  await getAdminUser();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  const rows = await getProductsList();
  const filenameBase = `products-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    const buffer = await toExcelBuffer('Products', rows, COLUMNS);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  if (format === 'pdf') {
    const buffer = await toPdfBuffer('Products Report', rows, COLUMNS);
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
