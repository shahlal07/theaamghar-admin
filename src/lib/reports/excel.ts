import ExcelJS from 'exceljs';
import type { ReportColumn } from './csv';

export async function toExcelBuffer<T>(
  sheetName: string,
  rows: T[],
  columns: ReportColumn<T>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.header, width: 20 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c) => [c.header, c.value(row)])));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
