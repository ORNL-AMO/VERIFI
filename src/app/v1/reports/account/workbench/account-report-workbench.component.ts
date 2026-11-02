import { BetterPlantsReportService } from '../better-plants/better-plants-report.service';
import { Component, computed, effect, inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { AccountReportWorkbenchContext } from './account-report-workbench-context.service';
import { AccountReportAutosaveService } from './account-report-autosave.service';
import { hasAccountReportDataChecks } from './account-report-workbench.models';
import { AccountReportDeleteService } from './delete/account-report-delete.service';

@Component({ selector: 'app-account-report-workbench', standalone: false,
  templateUrl: './account-report-workbench.component.html', styleUrls: ['./account-report-workbench.component.css'],
  providers: [AccountReportWorkbenchContext, AccountReportAutosaveService, AccountReportDeleteService, BetterPlantsReportService], host: { '(window:beforeunload)': 'beforeUnload($event)' } })
export class AccountReportWorkbenchComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(AccountReportAutosaveService);
  readonly betterPlants = inject(BetterPlantsReportService);
  readonly checksWorkflow = computed(() => this.context.report()?.reportType === 'betterPlants' ? this.betterPlants.workflow() : undefined);
  readonly canContinue = computed(() => !!this.next()?.canOpen
    && (this.context.stage() !== 'data-checks' || !this.checksWorkflow() || this.checksWorkflow()!.completed));
  private readonly router = inject(Router);
  readonly stages = computed(() => this.context.stages().map(stage => ({ ...stage,
    canOpen: stage.id === 'setup' || this.editor.setupValid(),
    ...(stage.id === 'setup' ? { completed: this.editor.setupValid(), hasBlockingErrors: !this.editor.setupValid() } : {})
  })));
  readonly previous = computed(() => { const stages = this.stages(); return stages[stages.findIndex(stage => stage.current) - 1]; });
  readonly next = computed(() => { const stages = this.stages(); return stages[stages.findIndex(stage => stage.current) + 1]; });
  constructor() {
    effect(() => {
      const checks = this.checksWorkflow();
      this.context.checksCompleted.set(checks?.completed ?? false);
      this.context.checksBlocked.set(checks?.blocked ?? false);
    });
    effect(() => {
      const report = this.context.report();
      if (report && this.context.stage() === 'data-checks' && !hasAccountReportDataChecks(report.reportType)) {
        void this.router.navigate(this.context.navigation.accountReportWorkbenchRoute(report.accountId, report.guid), { replaceUrl: true });
      }
    });
  }
  switchReport(guid: string): void {
    const report = this.context.reports().find(item => item.guid === guid);
    if (report) void this.router.navigate(this.context.navigation.accountReportWorkbenchRoute(report.accountId, report.guid));
  }
  beforeUnload(event: BeforeUnloadEvent): void { if (this.editor.needsProtection()) { event.preventDefault(); event.returnValue = ''; } }
}
export const accountReportLeaveGuard: CanDeactivateFn<AccountReportWorkbenchComponent> = component => component.editor.flush();
