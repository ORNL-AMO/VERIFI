import { vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  it('queues at most three visible notifications', () => {
    service.success('One', { durationMs: 0 });
    service.info('Two', { durationMs: 0 });
    service.warning('Three', { durationMs: 0 });
    service.danger('Four', { durationMs: 0 });

    expect(service.notifications().map(notification => notification.title)).toEqual(['Two', 'Three', 'Four']);
  });

  it('applies default durations by tone', () => {
    expect(service.success('Saved').durationMs).toBe(5000);
    expect(service.info('Heads up').durationMs).toBe(5000);
    expect(service.warning('Check this').durationMs).toBe(8000);
    expect(service.danger('Could not save').durationMs).toBe(8000);
  });

  it('dismisses notifications automatically after their duration', async () => {
    const notification = service.success('Saved', { durationMs: 1500 });

    await vi.advanceTimersByTimeAsync(1499);
    expect(service.notifications()).toContain(notification);

    await vi.advanceTimersByTimeAsync(1);
    expect(service.notifications()).not.toContain(notification);
  });

  it('dismisses one notification or all notifications', () => {
    const first = service.success('Saved', { durationMs: 0 });
    service.danger('Could not save', { durationMs: 0 });

    service.dismiss(first.id);
    expect(service.notifications().map(notification => notification.title)).toEqual(['Could not save']);

    service.dismissAll();
    expect(service.notifications()).toEqual([]);
  });

  it('preserves supplied title and message copy', () => {
    service.warning('Backup completed with warnings', {
      message: 'Review skipped archive files.',
      dismissible: false,
      durationMs: 0
    });

    expect(service.notifications()[0]).toMatchObject({
      tone: 'warning',
      title: 'Backup completed with warnings',
      message: 'Review skipped archive files.',
      dismissible: false
    });
  });
});
