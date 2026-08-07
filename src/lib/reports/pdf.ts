import PDFDocument from 'pdfkit';
import type { ReportColumn } from './csv';

export async function toPdfBuffer<T>(
  title: string,
  rows: T[],
  columns: ReportColumn<T>[]
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text(title, { align: 'left' });
  doc.fontSize(9).fillColor('#666').text(new Date().toLocaleString('en-PK'));
  doc.moveDown(1);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / columns.length;
  const rowHeight = 18;

  function drawHeader(y: number) {
    doc.fontSize(9).fillColor('#000').font('Helvetica-Bold');
    columns.forEach((c, i) => {
      doc.text(c.header, doc.page.margins.left + i * colWidth, y, {
        width: colWidth,
        ellipsis: true,
      });
    });
    doc.font('Helvetica');
  }

  let y = doc.y;
  drawHeader(y);
  y += rowHeight;
  doc
    .moveTo(doc.page.margins.left, y - 4)
    .lineTo(doc.page.width - doc.page.margins.right, y - 4)
    .strokeColor('#ccc')
    .stroke();

  for (const row of rows) {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader(y);
      y += rowHeight;
    }
    doc.fontSize(9).fillColor('#000');
    columns.forEach((c, i) => {
      doc.text(String(c.value(row)), doc.page.margins.left + i * colWidth, y, {
        width: colWidth,
        ellipsis: true,
      });
    });
    y += rowHeight;
  }

  if (rows.length === 0) {
    doc.fontSize(10).fillColor('#666').text('No data in this range.', doc.page.margins.left, y);
  }

  doc.end();
  return done;
}
