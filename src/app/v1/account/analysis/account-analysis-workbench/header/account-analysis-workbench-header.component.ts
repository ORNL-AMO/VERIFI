import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';

@Component({
  selector: 'app-account-analysis-workbench-header',
  standalone: true,
  imports: [RouterLink, IconComponent, DataWorkbenchFactsToggleComponent, DataWorkbenchResourceSwitcherComponent],
  templateUrl: './account-analysis-workbench-header.component.html',
  styleUrls: ['./account-analysis-workbench-header.component.css']
})
export class AccountAnalysisWorkbenchHeaderComponent {
  private readonly router = inject(Router);
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly workflow = inject(AccountAnalysisWorkbenchNavigationService);
  readonly analysisResources = computed(() => this.context.analyses().map(analysis => ({
    id: analysis.guid,
    label: analysis.name || 'Untitled analysis',
    icon: analysis.analysisCategory === 'water' ? 'droplet' as const : 'energy' as const
  })));
  readonly statusPresentation = computed(() => {
    const state = this.context.status.state();
    if (state !== 'ready') return { label: state === 'error' ? 'Status unavailable' : 'Checking status', tone: 'info' as const, icon: 'loading' as const };
    if (this.context.hasBlockingErrors()) return { label: 'Needs attention', tone: 'danger' as const, icon: 'warning' as const };
    if (this.context.findings().some(item => item.severity === 'warning')) {
      return { label: 'Warnings', tone: 'warning' as const, icon: 'warning' as const };
    }
    return { label: 'No Issues', tone: 'success' as const, icon: 'success' as const };
  });
  readonly selectionSummary = computed(() => {
    const total = this.context.selections().length;
    return `${this.context.includedCount()} included · ${this.context.skippedCount()} skipped · ${total} total`;
  });

  switchAnalysis(analysisGuid: string): void {
    const account = this.context.account();
    if (account) void this.router.navigate(this.navigation.accountAnalysisWorkbenchRoute(account.guid, analysisGuid));
  }
}
