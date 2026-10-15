import { getBackupReminder } from './backup-reminder';

describe('backup reminder', () => {
  const now = new Date(2026, 9, 15, 12);

  it.each([
    [0, 'quiet'], [1, 'quiet'], [6, 'quiet'], [7, 'recommended'],
    [29, 'recommended'], [30, 'overdue'], [90, 'overdue']
  ] as const)('uses the correct urgency at %i calendar days', (days, tone) => {
    const date = new Date(2026, 9, 15 - days, 23, 59);
    const reminder = getBackupReminder(date, now);
    expect(reminder.tone).toBe(tone);
    expect(reminder.label).toBe(days === 0 ? 'Last backup: today' : `Last backup: ${days} ${days === 1 ? 'day' : 'days'} ago`);
    if (tone !== 'quiet') expect(reminder.detail).toContain(`Backup ${tone}`);
  });

  it.each([undefined, 'invalid', new Date(NaN)])('recommends a backup for an unknown date: %s', date => {
    expect(getBackupReminder(date, now)).toEqual({
      tone: 'recommended', label: 'No backup recorded', detail: 'No backup recorded. Backup recommended.'
    });
  });

  it('clamps future timestamps and accepts dates restored as strings', () => {
    expect(getBackupReminder(new Date(2027, 0, 1), now).label).toBe('Last backup: today');
    expect(getBackupReminder(new Date(2026, 9, 8).toISOString(), now).tone).toBe('recommended');
  });

  it('counts calendar days across the daylight-saving boundary', () => {
    expect(getBackupReminder(new Date(2026, 10, 1, 0), new Date(2026, 10, 8, 0)).label)
      .toBe('Last backup: 7 days ago');
  });
});
