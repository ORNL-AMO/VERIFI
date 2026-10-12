import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

@Component({
  selector: 'app-account-analysis-workbench-placeholder',
  standalone: true,
  imports: [IconComponent, RouterLink],
  templateUrl: './account-analysis-workbench-placeholder.component.html',
  styleUrls: ['./account-analysis-workbench-placeholder.component.css']
})
export class AccountAnalysisWorkbenchPlaceholderComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly analysis = computed(() => this.workspace.accountAnalyses()
    .find(item => item.guid === this.navigation.activeAnalysisGuid()));
}
