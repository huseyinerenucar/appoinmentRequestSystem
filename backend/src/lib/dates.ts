const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) {
    throw new Error(`${field} must be ISO date YYYY-MM-DD, got "${value}"`);
  }
  // Reject e.g. 2026-02-31 — Date normalizes invalid days, so round-trip check.
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m! - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`${field} is not a real calendar date: "${value}"`);
  }
}

/** Inclusive day enumeration of [start, end] as YYYY-MM-DD strings. */
export function eachDay(start: string, end: string): string[] {
  assertIsoDate(start, 'start');
  assertIsoDate(end, 'end');
  if (start > end) return [];
  const out: string[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const cur = new Date(Date.UTC(sy!, sm! - 1, sd!));
  const endTs = Date.parse(`${end}T00:00:00Z`);
  while (cur.getTime() <= endTs) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function daysBetween(start: string, end: string): number {
  return eachDay(start, end).length;
}
