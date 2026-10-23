const FORMULA_PREFIX = /^\s*[=+\-@]/;

export function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  const safeText = FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: unknown[], rows: unknown[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
}

export function buildCsvBlob(headers: unknown[], rows: unknown[][]): Blob {
  return new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
}
