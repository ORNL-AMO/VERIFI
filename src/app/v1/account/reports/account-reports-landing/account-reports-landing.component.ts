import { Component, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

@Component({
  selector: 'app-account-reports-landing', standalone: false,
  templateUrl: './account-reports-landing.component.html',
  styleUrls: ['./account-reports-landing.component.css']
})
export class AccountReportsLandingComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
}
