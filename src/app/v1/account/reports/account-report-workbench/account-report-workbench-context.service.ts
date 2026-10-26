import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountReportAnalysisGuid, accountReportAnalysisIsEligible, accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { singleFacilityAnalysisPairIsCurrent } from '@data/account-workspace/single-facility-analysis-pairs';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildReportInventory, ReportInventoryEntry } from '@app/v1/shared/reports/report-inventory.models';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';
import { buildReportStages, reportStage } from '@app/v1/shared/reports/report-workbench.models';
import { hasAccountReportDataChecks, reportAnalysisOptions, reportAnalysisToken, savedReportAnalysisChoice } from './account-report-workbench.models';

@Injectable()
export class AccountReportWorkbenchContext {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly guid = computed(() => this.params().get('reportGuid') ?? '');
  readonly key = computed(() => JSON.stringify([this.workspace.account()?.guid, this.navigation.routeState().accountGuid, this.guid()]));
  readonly reports = computed(() => this.navigation.routeState().accountGuid === this.workspace.account()?.guid
    ? this.workspace.accountReports().filter(report => report.accountId === this.workspace.account()?.guid && reportTypeAvailable(report.reportType, this.workspace.account()?.displayEmissions))
      .slice().sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.guid.localeCompare(b.guid)) : []);
  readonly report = computed(() => this.reports().find(item => item.guid === this.guid()));
  readonly findings = computed(() => this.status.items().filter(item => item.entity.kind === 'account-report'
    && item.entity.accountGuid === this.workspace.account()?.guid && item.entity.guid === this.report()?.guid));
  readonly entry = computed(() => {
    const snapshot = this.workspace.snapshot(), report = this.report();
    return snapshot && report ? buildReportInventory(snapshot, this.status.items(), this.status.state()).find((item): item is Extract<ReportInventoryEntry, { scope: 'account' }> => item.scope === 'account' && item.report.guid === report.guid) : undefined;
  });
  readonly stage = computed(() => reportStage(this.navigation.routeState().reportStage));
  readonly checksBlocked = signal(false);
  readonly checksCompleted = signal(false);
  readonly stages = computed(() => { const entry = this.entry(); return entry ? buildReportStages(
    ['/v1', 'workspace', 'account', entry.report.accountId, 'reports', 'workbench', entry.report.guid], entry.typeLabel, this.stage(), hasAccountReportDataChecks(entry.report.reportType), entry.status).map(stage => stage.id === 'data-checks' && entry.report.reportType === 'betterPlants' ? { ...stage, completed: this.checksCompleted(), hasBlockingErrors: this.checksBlocked() } : stage) : []; });
  readonly resources = computed(() => this.reports().map(report => ({ id: report.guid, label: report.name || 'Untitled account report', icon: 'report' as const })));
  readonly dashboardRoute = computed(() => this.navigation.accountReportsRoute(this.navigation.routeState().accountGuid ?? ''));
  readonly breadcrumbs = computed(() => [{ label: `${this.workspace.account()?.name || 'Account'} Reports`, route: this.dashboardRoute() }, { label: this.report()?.name || 'Report' }]);
  readonly usesAnalysis = computed(() => !!this.report() && !!accountReportAnalysisSetupKey(this.report()!.reportType));
  readonly analysisOptions = computed(() => { const snapshot = this.workspace.snapshot(), report = this.report(); return snapshot && report && this.usesAnalysis() ? reportAnalysisOptions(report, snapshot) : []; });
  readonly savedAnalysisValue = computed(() => {
    const snapshot = this.workspace.snapshot(), report = this.report();
    const choice = snapshot && report ? savedReportAnalysisChoice(report, snapshot) : null;
    return choice ? reportAnalysisToken(choice) : null;
  });
  readonly savedAnalysisUnavailable = computed(() => this.analysisOptions().some(option => option.value === this.savedAnalysisValue() && option.unavailable));
  readonly needsPairRefresh = computed(() => {
    const snapshot = this.workspace.snapshot(), report = this.report();
    if (!snapshot || !report) return false;
    const choice = savedReportAnalysisChoice(report, snapshot);
    if (choice?.scope !== 'facility') return false;
    const pair = snapshot.accountAnalyses.find(item => item.guid === accountReportAnalysisGuid(report) && item.accountId === report.accountId);
    const facility = snapshot.facilities.find(item => item.guid === choice.facilityGuid && item.accountId === report.accountId);
    const analysis = snapshot.facilityAnalyses.find(item => item.guid === choice.analysisGuid && item.facilityId === choice.facilityGuid && item.accountId === report.accountId);
    return !!pair && !!facility && !!analysis && accountReportAnalysisIsEligible(analysis) && !singleFacilityAnalysisPairIsCurrent(pair, facility, analysis);
  });
}
