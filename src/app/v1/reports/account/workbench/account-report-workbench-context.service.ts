import { reportTypePresentation } from '@app/v1/reports/catalog/report-catalog';
import { Injectable, computed, inject } from '@angular/core';
import { REPORT_SESSION_IDENTITY } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountReportAnalysisGuid, accountReportAnalysisIsEligible, accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { singleFacilityAnalysisPairIsCurrent } from '@data/account-workspace/single-facility-analysis-pairs';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildReportInventory, ReportInventoryEntry } from '@app/v1/reports/inventory/report-inventory.models';
import { reportTypeAvailable } from '@app/v1/reports/catalog/report-availability';
import { reportIcon } from '@app/v1/reports/catalog/report-icons';
import { buildReportStages, reportStage } from '@app/v1/reports/shared/workbench/report-workbench.models';
import { hasAccountReportDataChecks, reportAnalysisOptions, reportAnalysisToken, savedReportAnalysisChoice } from './account-report-workbench.models';

@Injectable()
export class AccountReportWorkbenchContext {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly identity = inject(REPORT_SESSION_IDENTITY, { optional: true });
  readonly accountGuid = computed(() => this.identity?.accountGuid ?? this.navigation.routeState().accountGuid);
  readonly guid = computed(() => this.identity?.reportGuid ?? this.params().get('reportGuid') ?? '');
  readonly key = computed(() => JSON.stringify([this.accountGuid(), this.guid()]));
  readonly reports = computed(() => this.accountGuid() === this.workspace.account()?.guid
    ? this.workspace.accountReports().filter(report => report.accountId === this.accountGuid() && reportTypeAvailable('account', report.reportType, this.workspace.account()?.displayEmissions))
      .slice().sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.guid.localeCompare(b.guid)) : []);
  readonly report = computed(() => this.reports().find(item => item.guid === this.guid()));
  readonly findings = computed(() => this.status.items().filter(item => item.entity.kind === 'account-report'
    && item.entity.accountGuid === this.workspace.account()?.guid && item.entity.guid === this.report()?.guid));
  readonly entry = computed(() => {
    const snapshot = this.workspace.snapshot(), report = this.report();
    return snapshot && report ? buildReportInventory(snapshot, this.status.items(), this.status.state()).find((item): item is Extract<ReportInventoryEntry, { scope: 'account' }> => item.scope === 'account' && item.report.guid === report.guid) : undefined;
  });
  readonly typeLabel = computed(() => {
    const report = this.report();
    return report ? reportTypePresentation('account', report.reportType, this.navigation.isSingleSiteWorkspace()).label : 'Report';
  });
  readonly stage = computed(() => reportStage(this.navigation.routeState().reportStage));
  readonly stages = computed(() => { const entry = this.entry(); return entry ? buildReportStages(
    ['/v1', 'workspace', 'account', entry.report.accountId, 'reports', 'workbench', entry.report.guid], entry.typeLabel, this.stage(), hasAccountReportDataChecks(entry.report.reportType), entry.status, reportIcon(entry.report)) : []; });
  readonly resources = computed(() => this.reports().map(report => ({ id: report.guid, label: report.name || 'Untitled account report', icon: reportIcon(report) })));
  readonly dashboardRoute = computed(() => this.navigation.accountReportsRoute(this.accountGuid() ?? ''));
  readonly breadcrumbs = computed(() => this.navigation.isSingleSiteWorkspace() ? [{ label: 'Reports', icon: 'reports' as const, route: this.dashboardRoute() }] : [{ label: this.workspace.account()?.name || 'Account', route: this.dashboardRoute() }]);
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
