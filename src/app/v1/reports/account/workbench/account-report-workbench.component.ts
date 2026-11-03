import { Component, Injector, computed, inject } from '@angular/core';
import { ActivatedRoute, CanDeactivateFn } from '@angular/router';
import { ReportHostAdapter, REPORT_HOST } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { ReportWorkbenchController } from '@app/v1/reports/shared/workbench/report-workbench.controller';
import { AccountReportWorkbenchContext } from './account-report-workbench-context.service';
import { AccountReportDeleteService } from './delete/account-report-delete.service';
import { ACCOUNT_REPORT_FEATURES, PENDING_ACCOUNT_REPORT } from '../account-report.definitions';

function accountReportHost(): ReportHostAdapter {
  const context = inject(AccountReportWorkbenchContext), route = inject(ActivatedRoute), owner = inject(Injector);
  return {
    identity: computed(() => { const report = context.report(); return report ? { scope: 'account' as const, accountGuid: report.accountId, reportGuid: report.guid } : undefined; }),
    stage: context.stage, stages: context.stages,
    presentation: computed(() => {
      const report = context.report(), entry = context.entry();
      return report && entry ? { name: report.name || 'Untitled account report', typeLabel: context.typeLabel(),
        breadcrumbs: context.breadcrumbs(), breadcrumbLabel: 'Account report breadcrumb', titleId: 'account-report-workbench-title',
        resources: context.resources(), selectedId: report.guid, status: entry.status, statusLabel: entry.statusLabel, facts: entry.snapshot.facts } : undefined;
    }),
    state: computed(() => ['loading', 'switching'].includes(context.workspace.status()) ? 'loading' : context.workspace.status() === 'error' ? 'error' : context.report() ? 'ready' : 'unavailable'),
    error: computed(() => context.workspace.error()?.message),
    returnLink: computed(() => ({ route: context.dashboardRoute() })),
    definitions: ACCOUNT_REPORT_FEATURES, fallback: PENDING_ACCOUNT_REPORT,
    type: () => context.report()?.reportType,
    providers: () => [AccountReportWorkbenchContext, { provide: ActivatedRoute, useValue: route },
      { provide: AccountReportDeleteService, useValue: owner.get(AccountReportDeleteService) }],
    reportLink: (guid, stage = 'setup') => ({ route: context.navigation.accountReportWorkbenchRoute(context.accountGuid() ?? '', guid, stage) })
  };
}

@Component({ selector: 'app-account-report-workbench', standalone: false,
  templateUrl: './account-report-workbench.component.html', styleUrls: ['./account-report-workbench.component.css'],
  providers: [AccountReportWorkbenchContext, ReportWorkbenchController, AccountReportDeleteService, { provide: REPORT_HOST, useFactory: accountReportHost }] })
export class AccountReportWorkbenchComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly workbench = inject(ReportWorkbenchController);
  get editor() { return this.workbench.session()!.runtime.editor; }
  switchReport(guid: string): void { this.workbench.switchReport(guid); }
}
export const accountReportLeaveGuard: CanDeactivateFn<AccountReportWorkbenchComponent> = component => component.workbench.flush();
