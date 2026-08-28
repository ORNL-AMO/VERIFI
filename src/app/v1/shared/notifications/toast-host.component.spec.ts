import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { NotificationsModule } from './notifications.module';
import { ToastHostComponent } from './toast-host.component';

describe('ToastHostComponent', () => {
  let fixture: ComponentFixture<ToastHostComponent>;
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationsModule]
    });
    notifications = TestBed.inject(NotificationService);
    notifications.dismissAll();
    fixture = TestBed.createComponent(ToastHostComponent);
  });

  afterEach(() => {
    notifications.dismissAll();
  });

  it('renders no host chrome when no notifications are visible', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-toast-stack')).toBeNull();
  });

  it('renders tone classes and icons for each notification tone', () => {
    notifications.success('Saved', { durationMs: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-toast--success .fa-circle-check')).toBeTruthy();

    notifications.dismissAll();
    notifications.danger('Save failed', { durationMs: 0 });
    notifications.warning('Check results', { durationMs: 0 });
    notifications.info('Import running', { durationMs: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-toast--danger .fa-circle-xmark')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.v1-toast--warning .fa-triangle-exclamation')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.v1-toast--info .fa-circle-info')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.v1-toast')).toHaveLength(3);
  });

  it('uses assertive semantics for danger and polite semantics for other tones', () => {
    notifications.danger('Save failed', { durationMs: 0 });
    notifications.info('Import running', { durationMs: 0 });
    fixture.detectChanges();

    const danger = fixture.nativeElement.querySelector('.v1-toast--danger');
    const info = fixture.nativeElement.querySelector('.v1-toast--info');
    expect(danger.getAttribute('role')).toBe('alert');
    expect(danger.getAttribute('aria-live')).toBe('assertive');
    expect(info.getAttribute('role')).toBe('status');
    expect(info.getAttribute('aria-live')).toBe('polite');
  });

  it('dismisses a notification from its close button', () => {
    notifications.success('Saved', { durationMs: 0 });
    fixture.detectChanges();

    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-toast__close');
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-toast')).toBeNull();
  });
});
