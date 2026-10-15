export interface BackupReminder {
  readonly tone: 'quiet' | 'recommended' | 'overdue';
  readonly label: string;
  readonly detail: string;
}

/** Calendar days avoid DST changing the weekly reminder boundary. */
export function getBackupReminder(lastBackup: Date | string | undefined, now: Date): BackupReminder {
  const date = lastBackup ? new Date(lastBackup) : undefined;
  if (!date || !Number.isFinite(date.getTime())) {
    return { tone: 'recommended', label: 'No backup recorded', detail: 'No backup recorded. Backup recommended.' };
  }
  const days = Math.max(0, Math.round((calendarDay(now) - calendarDay(date)) / 86400000));
  const tone = days >= 30 ? 'overdue' : days >= 7 ? 'recommended' : 'quiet';
  const age = days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const urgency = tone === 'overdue' ? ' Backup overdue.' : tone === 'recommended' ? ' Backup recommended.' : '';
  return {
    tone,
    label: `Last backup: ${age}`,
    detail: `Last backup: ${date.toLocaleString()}.${urgency}`
  };
}

function calendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}
