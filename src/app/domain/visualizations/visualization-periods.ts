import { validCivil } from './utility/utility-periods';

/** Callers validate civil dates before converting them to a calendar-month index. */
export function civilMonthIndex(value: string): number {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

export function civilMonthRange(index: number): { start: string; end: string } {
  const year = Math.floor(index / 12), month = index % 12 + 1;
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const date = new Date(0); date.setUTCFullYear(year, month, 0);
  return { start: `${prefix}-01`, end: `${prefix}-${String(date.getUTCDate()).padStart(2, '0')}` };
}

export function wholeMonthWindow(start: string, end: string): { start: string; end: string } | undefined {
  if (!validCivil(start) || !validCivil(end) || start > end) return undefined;
  let first = civilMonthIndex(start);
  let last = civilMonthIndex(end);
  if (civilMonthRange(first).start < start) first++;
  if (civilMonthRange(last).end > end) last--;
  return first <= last ? { start: civilMonthRange(first).start, end: civilMonthRange(last).end } : undefined;
}
