export type ImportComparisonSortDirection = 'asc' | 'desc';
export type ImportComparisonValueField = 'current' | 'imported' | 'difference' | 'percentage';
export type ImportComparisonAriaSort = 'none' | 'ascending' | 'descending';

interface ImportReadingComparisonValues {
  readonly currentValue?: number;
  readonly importedValue?: number;
  readonly difference?: number;
  readonly percentageDifference?: number;
}

export function importComparisonAriaSort<TField extends string>(
  fields: readonly TField[],
  activeField: TField,
  direction: ImportComparisonSortDirection
): Record<TField, ImportComparisonAriaSort> {
  const result = Object.fromEntries(fields.map(field => [field, 'none'])) as Record<TField, ImportComparisonAriaSort>;
  result[activeField] = direction === 'asc' ? 'ascending' : 'descending';
  return result;
}

export function sortImportReadingComparisons<TComparison extends ImportReadingComparisonValues, TDateField extends string>(
  comparisons: readonly TComparison[],
  field: TDateField | ImportComparisonValueField,
  dateField: TDateField,
  dateValue: (comparison: TComparison) => number,
  direction: ImportComparisonSortDirection
): TComparison[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...comparisons].sort((left, right) =>
    compareOptionalNumbers(
      field === dateField ? dateValue(left) : comparisonValue(left, field as ImportComparisonValueField),
      field === dateField ? dateValue(right) : comparisonValue(right, field as ImportComparisonValueField)
    ) * multiplier);
}

function comparisonValue(
  comparison: ImportReadingComparisonValues,
  field: ImportComparisonValueField
): number | undefined {
  if (field === 'current') return comparison.currentValue;
  if (field === 'imported') return comparison.importedValue;
  if (field === 'difference') return comparison.difference;
  return comparison.percentageDifference;
}

function compareOptionalNumbers(left: number | undefined, right: number | undefined): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}
