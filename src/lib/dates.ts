const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

// 31 Jan 2028
export function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Date -> "2028-01-31" (local date, no timezone shifting)
export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2028-01-31" or "2026-02" -> Date (month-only values become the 1st). Returns null if invalid.
export function parseYMD(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = m[3] ? Number(m[3]) : 1;
  const date = new Date(y, mo, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null;
  return date;
}

// "2028-01-31" -> "31 Jan 2028", and "2026-02" -> "Feb 2026" (day unknown)
export function formatDetailDate(v: string): string {
  const d = parseYMD(v);
  if (!d) return v;
  return v.length === 7 ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : formatDate(d);
}