import { Injectable, OnDestroy, signal } from '@angular/core';

const MAX_VISIBLE_NOTIFICATIONS = 3;
const DEFAULT_SUCCESS_DURATION_MS = 5000;
const DEFAULT_INFO_DURATION_MS = 5000;
const DEFAULT_WARNING_DURATION_MS = 8000;
const DEFAULT_DANGER_DURATION_MS = 8000;

let nextNotificationId = 0;

export type NotificationTone = 'success' | 'danger' | 'warning' | 'info';

export interface NotificationAction {
  readonly label: string;
  readonly ariaLabel?: string;
}

export interface NotificationRequest {
  readonly tone: NotificationTone;
  readonly title: string;
  readonly message?: string;
  readonly durationMs?: number;
  readonly dismissible?: boolean;
  readonly action?: NotificationAction;
}

export type NotificationShortcutOptions = Omit<NotificationRequest, 'tone' | 'title'>;

export interface NotificationToast extends NotificationRequest {
  readonly id: string;
  readonly durationMs: number;
  readonly dismissible: boolean;
  readonly createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly writableNotifications = signal<NotificationToast[]>([]);
  private readonly timeoutIds = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications = this.writableNotifications.asReadonly();

  ngOnDestroy(): void {
    this.dismissAll();
  }

  show(request: NotificationRequest): NotificationToast {
    const notification: NotificationToast = {
      ...request,
      id: `v1-toast-${++nextNotificationId}`,
      createdAt: Date.now(),
      durationMs: request.durationMs ?? getDefaultDuration(request.tone),
      dismissible: request.dismissible ?? true
    };

    this.writableNotifications.update(current => {
      const next = [...current, notification];
      const removed = next.slice(0, Math.max(0, next.length - MAX_VISIBLE_NOTIFICATIONS));
      removed.forEach(item => this.clearDismissTimer(item.id));
      return next.slice(-MAX_VISIBLE_NOTIFICATIONS);
    });
    this.scheduleDismiss(notification);
    return notification;
  }

  success(title: string, options: NotificationShortcutOptions = {}): NotificationToast {
    return this.show({ ...options, title, tone: 'success' });
  }

  danger(title: string, options: NotificationShortcutOptions = {}): NotificationToast {
    return this.show({ ...options, title, tone: 'danger' });
  }

  warning(title: string, options: NotificationShortcutOptions = {}): NotificationToast {
    return this.show({ ...options, title, tone: 'warning' });
  }

  info(title: string, options: NotificationShortcutOptions = {}): NotificationToast {
    return this.show({ ...options, title, tone: 'info' });
  }

  dismiss(id: string): void {
    this.clearDismissTimer(id);
    this.writableNotifications.update(current => current.filter(notification => notification.id !== id));
  }

  dismissAll(): void {
    this.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeoutIds.clear();
    this.writableNotifications.set([]);
  }

  private scheduleDismiss(notification: NotificationToast): void {
    if (notification.durationMs <= 0) {
      return;
    }
    const timeoutId = setTimeout(() => this.dismiss(notification.id), notification.durationMs);
    this.timeoutIds.set(notification.id, timeoutId);
  }

  private clearDismissTimer(id: string): void {
    const timeoutId = this.timeoutIds.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIds.delete(id);
    }
  }
}

function getDefaultDuration(tone: NotificationTone): number {
  switch (tone) {
    case 'danger':
      return DEFAULT_DANGER_DURATION_MS;
    case 'warning':
      return DEFAULT_WARNING_DURATION_MS;
    case 'info':
      return DEFAULT_INFO_DURATION_MS;
    case 'success':
    default:
      return DEFAULT_SUCCESS_DURATION_MS;
  }
}
