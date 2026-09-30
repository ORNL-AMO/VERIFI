import {
  likelyGeneralWorkbookDateColumn,
  profileGeneralWorkbookColumn
} from './general-workbook-column-profile';
import { ColumnItem } from './spreadsheet-import.models';

describe('general workbook column profiles', () => {
  const column = (value: string, id = value): ColumnItem => ({ id, value, index: 0 });

  it('recognizes the supported date aliases case-insensitively', () => {
    for (const header of ['Date', 'read date', 'READING DATE', 'Bill Date', 'billing date']) {
      expect(profileGeneralWorkbookColumn(column(header), [{ [header]: '2026-01-01' }]).likelyDate).toBe(true);
    }
  });

  it('requires at least ninety percent usable nonblank dates', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      'Read Date': index === 9 ? 'not-a-date' : `2026-01-${String(index + 1).padStart(2, '0')}`
    }));

    const profile = profileGeneralWorkbookColumn(column('Read Date'), rows);

    expect(profile.likelyDate).toBe(true);
    expect(profile.usableDateCount).toBe(9);
    expect(profile.invalidDateRows).toEqual([11]);
  });

  it('profiles samples, range, and worksheet row numbers for invalid values', () => {
    const profile = profileGeneralWorkbookColumn(column('Date'), [
      { Date: '2026-02-01' },
      { Date: '' },
      { Date: 'bad' },
      { Date: '2026-01-01' }
    ]);

    expect(profile.samples).toEqual(['2026-02-01', 'bad']);
    expect(profile.nonBlankCount).toBe(3);
    expect(profile.usableDateCount).toBe(2);
    expect(profile.invalidDateRows).toEqual([4]);
    expect(profile.minDate?.getUTCMonth()).toBe(0);
    expect(profile.maxDate?.getUTCMonth()).toBe(1);
  });

  it('auto-selects only one unambiguous likely date column', () => {
    const date = column('Date');
    const readDate = column('Read Date');
    const value = column('Electricity');

    expect(likelyGeneralWorkbookDateColumn([date, value], [{ Date: '2026-01-01', Electricity: 10 }])).toBe(date);
    expect(likelyGeneralWorkbookDateColumn([date, readDate], [{ Date: '2026-01-01', 'Read Date': '2026-01-31' }])).toBeUndefined();
    expect(likelyGeneralWorkbookDateColumn([value], [{ Electricity: 10 }])).toBeUndefined();
  });

  it('does not suggest an alias with no usable dates', () => {
    const date = column('Date');

    expect(profileGeneralWorkbookColumn(date, [{ Date: 'bad' }]).likelyDate).toBe(false);
  });
});
