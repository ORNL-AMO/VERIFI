import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService, AccountAnalysisAutosaveState } from '../editing/account-analysis-autosave.service';

import { IdbAccount } from '@data/models/idbModels/account';
import { AnalysisStatusNotesComponent } from '@app/v1/shared/analysis-results/status-notes/analysis-status-notes.component';
import { analysisOutcomeDisplay, analysisOutcomeSummary, FacilityAnalysisOutcomeState } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { accountAnalysisSelectionSummary } from '../../account-analysis-dashboard/account-analysis.models';
import { AccountAnalysisResultsService, AccountAnalysisResultState } from '../results/calculation/account-analysis-results.service';

@Component({
  selector: 'app-account-analysis-workbench-header',
  standalone: true,
  imports: [RouterLink, IconComponent, DataWorkbenchFactsToggleComponent, DataWorkbenchResourceSwitcherComponent, AnalysisStatusNotesComponent],
  templateUrl: './account-analysis-workbench-header.component.html',
  styleUrls: ['./account-analysis-workbench-header.component.css']
})
export class AccountAnalysisWorkbenchHeaderComponent {
  private readonly router = inject(Router);
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly results = inject(AccountAnalysisResultsService);
  readonly autosave = inject(AccountAnalysisAutosaveService);
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
  readonly selectionSummary = computed(() => accountAnalysisSelectionSummary(this.context.selectionCounts()));
  readonly resultDisplay = computed(() => {
    const analysis = this.autosave.draft() || this.context.analysis();
    return analysisOutcomeDisplay(accountAnalysisResultOutcome(
      this.results.state(), this.autosave.state(), this.context.hasBlockingErrors(),
      this.context.account(), this.context.analysis()?.guid
    ), analysis?.analysisCategory ?? 'energy');
  });
  readonly dependencyMessage = computed(() => {
    const count = this.context.linkedReports().length;
    return count ? `Changes can affect ${count} ${count === 1 ? 'report' : 'reports'}.` : undefined;
  });

  async switchAnalysis(analysisGuid: string): Promise<void> {
    if (!await this.autosave.flush()) return;
    const account = this.context.account();
    if (account) await this.router.navigate(this.navigation.accountAnalysisWorkbenchRoute(account.guid, analysisGuid));
  }
}

export function accountAnalysisResultOutcome(
  state: AccountAnalysisResultState,
  autosaveState: AccountAnalysisAutosaveState,
  hasBlockingErrors: boolean,
  account: Pick<IdbAccount, 'fiscalYear'> | undefined,
  analysisGuid: string | undefined
): FacilityAnalysisOutcomeState {
  // A previously published result must never label a new analysis or an unsaved draft.
  if (autosaveState === 'invalid' || hasBlockingErrors) return { state: 'blocked', message: 'Setup incomplete' };
  if (autosaveState === 'error') return { state: 'error', message: 'Save failed' };
  if (autosaveState === 'dirty' || autosaveState === 'saving') return { state: 'loading', message: 'Waiting for save…' };
  if (state.analysisGuid !== analysisGuid) return { state: 'loading', message: 'Preparing data…' };
  if (state.state === 'ready') {
    return { state: 'ready', summary: analysisOutcomeSummary(state.annual, state.monthly, state.reportYear, account) };
  }
  if (state.state === 'loading') return { state: 'loading', message: 'Calculating…' };
  if (state.state === 'error') return { state: 'error', message: 'Calculation failed' };
  if (state.state === 'waiting') {
    if (state.reason === 'blocked') return { state: 'blocked', message: 'Setup incomplete' };
    return { state: 'loading', message: state.reason === 'autosave' ? 'Waiting for save…' : 'Preparing data…' };
  }
  return { state: 'error', message: 'Unavailable' };
}
