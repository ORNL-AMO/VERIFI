import { civilMonthIndex, civilMonthRange, wholeMonthWindow } from './visualization-periods';

describe('visualization civil-month mechanics', () => {
  it.each([
    ['0001-01-01', '0001-01-31'], ['0099-12-01', '0099-12-31'],
    ['1900-02-01', '1900-02-28'], ['2000-02-01', '2000-02-29'],
    ['2024-02-01', '2024-02-29'], ['9999-12-01', '9999-12-31']
  ])('resolves %s through %s without local-time or two-digit-year coercion', (start, end) => {
    expect(civilMonthRange(civilMonthIndex(start))).toEqual({ start, end });
    expect(civilMonthIndex(end)).toBe(civilMonthIndex(start));
  });

  it.each([
    ['2024-01-01', '2024-03-31', { start: '2024-01-01', end: '2024-03-31' }],
    ['2024-01-15', '2024-03-10', { start: '2024-02-01', end: '2024-02-29' }],
    ['2023-12-15', '2024-02-29', { start: '2024-01-01', end: '2024-02-29' }],
    ['2024-02-02', '2024-02-29', undefined],
    ['2023-02-29', '2024-03-31', undefined],
    ['2024-04-01', '2024-03-31', undefined],
    ['0000-01-01', '0000-12-31', undefined]
  ] as const)('keeps only whole native months within %s – %s', (start, end, expected) => {
    expect(wholeMonthWindow(start, end)).toEqual(expected);
  });
});
