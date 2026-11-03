import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, CanDeactivateFn } from '@angular/router';
import { ReportHostAdapter, REPORT_HOST } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { ReportWorkbenchController } from '@app/v1/reports/shared/workbench/report-workbench.controller';
import { FacilityReportWorkbenchContext } from './facility-report-workbench-context.service';
import { FACILITY_REPORT_FEATURES, PENDING_FACILITY_REPORT } from '../facility-report.definitions';

function facilityReportHost(): ReportHostAdapter {
  const context = inject(FacilityReportWorkbenchContext), route = inject(ActivatedRoute);
  return {
    identity: computed(() => { const report = context.report(); return report ? { scope: 'facility' as const, accountGuid: report.accountId, facilityGuid: report.facilityId, reportGuid: report.guid } : undefined; }),
    stage: context.stage, stages: context.stages,
    presentation: computed(() => {
      const report = context.report(), presentation = context.presentation(), facility = context.facility();
      if (!report || !presentation || !facility) return undefined;
      const breadcrumbs = context.navigation.isSingleSiteWorkspace() ? [{ label: 'Reports', icon: 'reports' as const, ...context.inventoryLink() }] : [
        { label: `${context.workspace.account()?.name || 'Account'} Reports`, route: context.navigation.accountReportsRoute(report.accountId) },
        { label: `${facility.name || 'Facility'} Reports`, ...context.inventoryLink() }, { label: report.name || 'Untitled facility report' }
      ];
      return { name: report.name || 'Untitled facility report', typeLabel: context.typeLabel(), breadcrumbs,
        breadcrumbLabel: 'Facility report breadcrumb', titleId: 'facility-report-workbench-title', resources: context.resources(), selectedId: report.guid,
        status: presentation.status, statusLabel: ({ ready: 'No Issues', error: 'Needs attention', warning: 'Needs review', checking: 'Checking setup', unavailable: 'Setup status unavailable' })[presentation.status], facts: presentation.facts };
    }),
    state: computed(() => ['loading', 'switching'].includes(context.workspace.status()) ? 'loading' : context.workspace.status() === 'error' ? 'error' : context.report() ? 'ready' : 'unavailable'),
    error: computed(() => context.workspace.error()?.message), returnLink: context.inventoryLink,
    definitions: FACILITY_REPORT_FEATURES, fallback: PENDING_FACILITY_REPORT, type: () => context.report()?.facilityReportType,
    providers: () => [FacilityReportWorkbenchContext, { provide: ActivatedRoute, useValue: route }],
    reportLink: (guid, stage = 'setup') => ({ route: context.navigation.facilityReportWorkbenchRoute(context.facility()?.guid ?? '', guid, stage) })
  };
}

@Component({ selector: 'app-facility-report-workbench', standalone: false,
  templateUrl: './facility-report-workbench.component.html', styleUrls: ['./facility-report-workbench.component.css'],
  providers: [FacilityReportWorkbenchContext, ReportWorkbenchController, { provide: REPORT_HOST, useFactory: facilityReportHost }] })
export class FacilityReportWorkbenchComponent {
  readonly context = inject(FacilityReportWorkbenchContext);
  readonly workbench = inject(ReportWorkbenchController);
  get editor() { return this.workbench.session()!.runtime.editor; }
  switchReport(guid: string): void { this.workbench.switchReport(guid); }
}
export const facilityReportLeaveGuard: CanDeactivateFn<FacilityReportWorkbenchComponent> = component => component.workbench.flush();
