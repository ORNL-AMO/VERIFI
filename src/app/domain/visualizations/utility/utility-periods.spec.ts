import { fiscalRange, resolveUtilityRanges, shiftMonths } from './utility-periods';

describe('utility source periods', () => {
  const owner = { fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
  const dates = { calendarDate: '2026-11-12', latestDataDate: '2026-09-23' };
  it('resolves real fiscal intervals with canonical end-year labels', () => {
    expect(fiscalRange(2026, owner)).toEqual({ start: '2025-07-01', end: '2026-06-30' });
    expect(resolveUtilityRanges({ kind: 'fiscal-year', year: 2026 }, { kind: 'previous-year', basis: 'fiscal' }, owner, dates)).toEqual([
      { role: 'primary', basis: 'fiscal', start: '2025-07-01', end: '2026-06-30' },
      { role: 'comparison', basis: 'fiscal', start: '2024-07-01', end: '2025-06-30' }
    ]);
  });
  it('resolves one latest-data anchor and excludes the incomplete current month', () => {
    expect(resolveUtilityRanges({ kind: 'rolling', count: 3, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: false }, { kind: 'none' }, owner, dates)[0])
      .toEqual({ role: 'primary', basis: 'calendar', start: '2026-06-01', end: '2026-08-31' });
  });
  it('uses previous whole months rather than an equal-day approximation', () => {
    const result = resolveUtilityRanges({ kind: 'fixed', start: '2024-02-01', end: '2024-02-29', basis: 'calendar' }, { kind: 'previous-period' }, owner, dates);
    expect(result[1]).toMatchObject({ start: '2024-01-01', end: '2024-01-31' });
    expect(shiftMonths('2024-02-29', -12)).toBe('2023-02-28');
  });
  it('includes a complete latest-data month and preserves January fiscal end labels', () => {
    expect(resolveUtilityRanges({ kind: 'rolling', count: 3, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: false }, { kind: 'none' }, owner,
      { ...dates, latestDataDate: '2026-09-30' })[0]).toMatchObject({ start: '2026-07-01', end: '2026-09-30' });
    expect(fiscalRange(2027, { ...owner, fiscalYearMonth: 0 })).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
  it('returns no fabricated history and rejects unresolved rolling anchors', () => {
    expect(resolveUtilityRanges({ kind: 'all-history' }, { kind: 'none' }, owner, dates)).toEqual([]);
    expect(() => resolveUtilityRanges({ kind: 'rolling', count: 1, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true }, { kind: 'none' }, owner, { calendarDate: dates.calendarDate })).toThrow();
  });
});
