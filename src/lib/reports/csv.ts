export type ReportColumn<T> = { header: string; value: (row: T) => string | number };

function escapeCsvCell(value: string | number): string {
  let str = String(value);
  // Formula-injection guard: Excel/Sheets treat a cell starting with
  // = + - @ as a formula, not text. Customer-controlled fields (delivery
  // name/city, profile name, etc.) flow into these exports unescaped
  // otherwise -- a crafted name like `=HYPERLINK("http://evil","x")` would
  // execute the moment an admin opens the file. A leading single quote
  // forces every spreadsheet app to render it as literal text.
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv<T>(rows: T[], columns: ReportColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}
