import { Component, inject } from '@angular/core';
import { CommandNotificationBridgeService } from '../../shared/notifications/command-notification-bridge.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

@Component({
  selector: 'app-workspace-shell',
  templateUrl: './workspace-shell.component.html',
  styleUrls: ['./workspace-shell.component.css'],
  standalone: false
})
export class WorkspaceShellComponent {
  private readonly commandNotificationBridge = inject(CommandNotificationBridgeService);
  readonly navigation = inject(WorkspaceNavigationService);
}
