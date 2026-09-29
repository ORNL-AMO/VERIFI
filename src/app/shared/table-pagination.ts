export const DEFAULT_TIME_PERIOD_PAGE_SIZE = 12;
export const TIME_PERIOD_PAGE_SIZE_OPTIONS = [12, 24, 36] as const;
export const EXTENDED_TIME_PERIOD_PAGE_SIZE_OPTIONS = [12, 24, 36, 48, 60] as const;
export const ALL_TABLE_ROWS_PAGE_SIZE = 999999999999;

export function normalizeTimePeriodPageSize(value: number | undefined): number {
  return value === ALL_TABLE_ROWS_PAGE_SIZE
    || (typeof value === 'number' && Number.isInteger(value) && value > 0 && value % 12 === 0)
    ? value
    : DEFAULT_TIME_PERIOD_PAGE_SIZE;
}
