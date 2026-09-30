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
    else invalidDateRows.push(worksheetRowNumber(row, index));
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
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) {
      const [, yearValue, monthValue, dayValue] = match;
      const year = Number(yearValue);
      const month = Number(monthValue) - 1;
      const day = Number(dayValue);
      const localDate = new Date(0);
      localDate.setHours(0, 0, 0, 0);
      localDate.setFullYear(year, month, day);
      if (localDate.getFullYear() === year && localDate.getMonth() === month && localDate.getDate() === day) {
        return localDate;
      }
      return undefined;
    }
  }
  const date = new Date(value as any);
  return isNaN(date.valueOf()) ? undefined : date;
}

function worksheetRowNumber(row: Record<string, unknown>, index: number): number {
  const sourceIndex = (row as Record<string, unknown> & { __rowNum__?: unknown }).__rowNum__;
  return typeof sourceIndex === 'number' ? sourceIndex + 1 : index + 2;
}

function isNonBlank(value: unknown): boolean {
  return value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');
}

function formatColumnSample(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
