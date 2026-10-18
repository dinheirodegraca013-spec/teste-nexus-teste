const FORMULA_PREFIX = /^[=+\-@]/;

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
