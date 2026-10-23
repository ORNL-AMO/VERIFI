import { Component, computed, inject, input } from '@angular/core';
import { StatusItem } from '@app/v1/status/status.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

@Component({ selector: 'app-status-finding-action', standalone: true,
  templateUrl: './status-finding-action.component.html', styleUrls: ['./status-finding-action.component.css'] })
export class StatusFindingActionComponent {
  readonly item = input.required<StatusItem>();
  readonly status = inject(WorkspaceStatusService);
  readonly label = computed(() => this.item().actionLabel ?? 'Review');
}
