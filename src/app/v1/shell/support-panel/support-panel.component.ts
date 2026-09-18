import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

@Component({
  selector: 'app-support-panel',
  templateUrl: './support-panel.component.html',
  styleUrls: ['./support-panel.component.css'],
  standalone: false
})
export class SupportPanelComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
}
