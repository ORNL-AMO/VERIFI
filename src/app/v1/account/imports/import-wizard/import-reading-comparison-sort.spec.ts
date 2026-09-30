import {
  importComparisonAriaSort,
  sortImportReadingComparisons
} from './import-reading-comparison-sort';

describe('import reading comparison sorting', () => {
  const comparisons = [
    { month: 2, currentValue: 10, importedValue: 12, difference: 2, percentageDifference: 20 },
    { month: 1, currentValue: 5, importedValue: 4, difference: -1, percentageDifference: undefined }
  ];

  it('sorts dates and numeric values without mutating the review rows', () => {
    expect(sortImportReadingComparisons(comparisons, 'month', 'month', value => value.month, 'desc'))
      .toEqual([comparisons[0], comparisons[1]]);
    expect(sortImportReadingComparisons(comparisons, 'imported', 'month', value => value.month, 'asc'))
      .toEqual([comparisons[1], comparisons[0]]);
    expect(comparisons.map(value => value.month)).toEqual([2, 1]);
  });

  it('places unavailable percentage differences last in ascending order', () => {
    expect(sortImportReadingComparisons(comparisons, 'percentage', 'month', value => value.month, 'asc'))
      .toEqual([comparisons[0], comparisons[1]]);
  });

  it('exposes one active accessible sort state', () => {
    expect(importComparisonAriaSort(['month', 'current', 'imported'], 'current', 'desc')).toEqual({
      month: 'none', current: 'descending', imported: 'none'
    });
  });
});
