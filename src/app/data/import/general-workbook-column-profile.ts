import { ColumnItem } from './spreadsheet-import.models';

const DATE_HEADER_ALIASES = new Set([
  'date',
  'read date',
  'reading date',
  'bill date',
  'billing date'
]);

export interface GeneralWorkbookColumnProfile {
  readonly columnId: string;
  readonly header: string;
  readonly samples: readonly string[];
  readonly nonBlankCount: number;
  readonly usableDateCount: number;
  readonly invalidDateRows: readonly number[];
  readonly minDate?: Date;
  readonly maxDate?: Date;
  readonly likelyDate: boolean;
}

export function profileGeneralWorkbookColumn(
  column: ColumnItem,
  rows: readonly Record<string, unknown>[]
): GeneralWorkbookColumnProfile {
  const samples: string[] = [];
  const dates: Date[] = [];
  const invalidDateRows: number[] = [];
  let nonBlankCount = 0;

  rows.forEach((row, index) => {
    const value = row[column.value];
    if (!isNonBlank(value)) return;
    nonBlankCount += 1;
    if (samples.length < 2) samples.push(formatColumnSample(value));
    const date = parseGeneralWorkbookDate(value);
    if (date) dates.push(date);
    else invalidDateRows.push(index + 2);
  });

  const times = dates.map(date => date.getTime());
  const normalizedHeader = column.value.trim().toLocaleLowerCase();
  return {
    columnId: column.id,
    header: column.value,
    samples,
    nonBlankCount,
    usableDateCount: dates.length,
    invalidDateRows,
    minDate: times.length ? new Date(Math.min(...times)) : undefined,
    maxDate: times.length ? new Date(Math.max(...times)) : undefined,
    likelyDate: DATE_HEADER_ALIASES.has(normalizedHeader)
      && nonBlankCount > 0
      && dates.length / nonBlankCount >= .9
  };
}

export function likelyGeneralWorkbookDateColumn(
  columns: readonly ColumnItem[],
  rows: readonly Record<string, unknown>[]
): ColumnItem | undefined {
  const candidates = columns.filter(column => profileGeneralWorkbookColumn(column, rows).likelyDate);
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function parseGeneralWorkbookDate(value: unknown): Date | undefined {
  const date = new Date(value as any);
  return isNaN(date.valueOf()) ? undefined : date;
}

function isNonBlank(value: unknown): boolean {
  return value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');
}

function formatColumnSample(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
