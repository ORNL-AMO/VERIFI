import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountReportReferencesAnalysis } from '@data/models/idbModels/accountReport';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildAccountAnalysisFacilitySelections, countAccountAnalysisSelections } from '../account-analysis-dashboard/account-analysis.models';
import { buildFacilitySelectionItems } from './select-facility-items/account-analysis-facility-selection.models';
import {
  accountAnalysisWorkbenchReadiness,
  buildAccountAnalysisWorkbenchStages
} from './account-analysis-workbench.models';

@Injectable()
export class AccountAnalysisWorkbenchContext {
  private readonly route = inject(ActivatedRoute);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly status = inject(WorkspaceStatusService);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly account = this.workspace.account;
  readonly analyses = this.workspace.accountAnalyses;
  readonly facilities = this.workspace.facilities;
  readonly facilityAnalyses = this.workspace.facilityAnalyses;
  readonly reports = this.workspace.accountReports;
  readonly analysisGuid = computed(() => this.routeParams().get('analysisGuid') ?? '');
  readonly analysis = computed(() => this.analyses().find(item => item.guid === this.analysisGuid()));
  readonly findings = computed(() => this.status.items().filter(item =>
    item.entity.kind === 'account-analysis' && item.entity.guid === this.analysisGuid()
  ));
  readonly selections = computed(() => {
    const analysis = this.analysis();
    return analysis ? buildAccountAnalysisFacilitySelections(
      analysis,
      this.facilities(),
      this.facilityAnalyses()
    ) : [];
  });
  readonly readiness = computed(() => accountAnalysisWorkbenchReadiness(
    this.analysis(),
    this.findings(),
    this.status.state() === 'ready',
    !!this.analysis() && buildFacilitySelectionItems(
      this.analysis()!, this.facilities(), this.facilityAnalyses(), this.status.items(), this.status.state()
    ).every(item => item.assigned && item.state !== 'error')
      && this.facilities().length > 0
  ));
  readonly stages = computed(() => {
    const account = this.account();
    const analysis = this.analysis();
    return account && analysis ? buildAccountAnalysisWorkbenchStages(account.guid, analysis.guid) : [];
  });
  readonly selectionCounts = computed(() => countAccountAnalysisSelections(this.selections()));
  readonly includedCount = computed(() => this.selections().filter(item => item.state === 'included').length);
  readonly skippedCount = computed(() => this.selections().filter(item => item.state === 'skipped').length);
  readonly linkedReports = computed(() => this.reports().filter(report =>
    accountReportReferencesAnalysis(report, this.analysisGuid())
  ));
  readonly isActiveForReporting = computed(() => {
    const account = this.account();
    const analysis = this.analysis();
    if (!account || !analysis) return false;
    return analysis.analysisCategory === 'water'
      ? account.selectedWaterAnalysisId === analysis.guid
      : account.selectedEnergyAnalysisId === analysis.guid;
  });
  readonly hasBlockingErrors = computed(() => this.findings().some(item => item.severity === 'error'));
}
