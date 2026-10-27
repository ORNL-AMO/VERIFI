import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { inventoryScopeBreadcrumbs } from '@app/v1/shared/page-identity/page-identity.component';

@Component({
  selector: 'app-facility-settings-page',
  templateUrl: './facility-settings.component.html',
  styleUrls: ['./facility-settings.component.css'],
  standalone: false
})
export class FacilitySettingsComponent {
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly facility = this.workspace.selectedFacility;
  readonly navigation = inject(WorkspaceNavigationService);
  readonly canWrite = this.workspace.canWrite;
  readonly breadcrumbs = computed(() => inventoryScopeBreadcrumbs(this.workspace.account()?.name || 'Account', this.facility()?.name));
}
