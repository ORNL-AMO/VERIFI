import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

@Component({
  selector: 'app-facility-analysis-workbench-placeholder',
  standalone: true,
  imports: [IconComponent, RouterLink],
  templateUrl: './facility-analysis-workbench-placeholder.component.html',
  styleUrls: ['./facility-analysis-workbench-placeholder.component.css']
})
export class FacilityAnalysisWorkbenchPlaceholderComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly analysis = computed(() => {
    const guid = this.navigation.activeAnalysisGuid();
    return guid ? this.workspace.selectedFacilityAnalyses().find(item => item.guid === guid) : undefined;
  });
}
