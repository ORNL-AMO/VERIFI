const REGRESSION_SIGNIFICANT_DIGITS = 5;

export function formatRegressionNumber(value: unknown, fallback = 'Unavailable'): string {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString(undefined, { maximumSignificantDigits: REGRESSION_SIGNIFICANT_DIGITS })
    : fallback;
}

export function roundRegressionNumber(value: unknown): number | undefined {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(numericValue)
    ? Number(numericValue.toPrecision(REGRESSION_SIGNIFICANT_DIGITS))
    : undefined;
}
