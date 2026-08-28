import { Component, inject } from '@angular/core';
import { NotificationService, NotificationTone } from './notification.service';

interface NotificationToneMetadata {
  readonly iconClass: string;
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
    success: { iconClass: 'fa-circle-check', role: 'status', live: 'polite' },
    danger: { iconClass: 'fa-circle-xmark', role: 'alert', live: 'assertive' },
    warning: { iconClass: 'fa-triangle-exclamation', role: 'status', live: 'polite' },
    info: { iconClass: 'fa-circle-info', role: 'status', live: 'polite' }
  };

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
