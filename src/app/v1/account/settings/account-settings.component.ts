import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { inventoryScopeBreadcrumbs } from '@app/v1/shared/page-identity/page-identity.component';

@Component({
  selector: 'app-account-settings-page',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css'],
  standalone: false
})
export class AccountSettingsComponent {
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly account = this.workspace.account;
  readonly navigation = inject(WorkspaceNavigationService);
  readonly canWrite = this.workspace.canWrite;
  readonly breadcrumbs = computed(() => inventoryScopeBreadcrumbs(this.workspace.account()?.name || 'Account'));
}
