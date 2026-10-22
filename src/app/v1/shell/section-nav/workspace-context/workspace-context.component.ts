import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
@Component({
  selector: 'app-workspace-context',
  templateUrl: './workspace-context.component.html',
  styleUrls: ['./workspace-context.component.css'],
  standalone: false
})
export class WorkspaceContextComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly hasSingleSiteRecovery = this.navigation.hasSingleSiteRecovery;
  readonly recoveryTitle = computed(() =>
    this.navigation.singleSiteWorkspaceState() === 'missing-facility'
      ? 'Single-facility setup needs a facility'
      : 'Single-facility setup needs one facility'
  );
  readonly recoveryMessage = computed(() =>
    this.navigation.singleSiteWorkspaceState() === 'missing-facility'
      ? 'This account is marked as single-facility, but no facility is available yet.'
      : 'This account is marked as single-facility, but it has more than one facility.'
  );
}
