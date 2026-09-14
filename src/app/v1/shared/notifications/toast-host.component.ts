import { Component, inject } from '@angular/core';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { NotificationService, NotificationTone } from './notification.service';

interface NotificationToneMetadata {
  readonly icon: IconName;
  readonly role: 'alert' | 'status';
  readonly live: 'assertive' | 'polite';
}

@Component({
  selector: 'app-notification-toast-host',
  templateUrl: './toast-host.component.html',
  styleUrls: ['./toast-host.component.css'],
  standalone: false
})
export class ToastHostComponent {
  private readonly notificationService = inject(NotificationService);

  readonly notifications = this.notificationService.notifications;
  readonly toneMetadata: Record<NotificationTone, NotificationToneMetadata> = {
    success: { icon: 'success', role: 'status', live: 'polite' },
    danger: { icon: 'danger', role: 'alert', live: 'assertive' },
    warning: { icon: 'warning', role: 'status', live: 'polite' },
    info: { icon: 'info', role: 'status', live: 'polite' }
  };

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
