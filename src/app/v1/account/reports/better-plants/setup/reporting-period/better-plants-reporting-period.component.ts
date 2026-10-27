import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountReportWorkbenchContext } from '../../../account-report-workbench/account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../../../account-report-workbench/account-report-autosave.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { getYearsWithFullDataAccount } from '@domain/calculations/shared-calculations/calculationsHelpers';

@Component({ selector: 'app-better-plants-reporting-period', standalone: false,
  templateUrl: './better-plants-reporting-period.component.html', styleUrls: ['./better-plants-reporting-period.component.css'] })
export class BetterPlantsReportingPeriodComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(AccountReportAutosaveService);
  readonly form = this.editor.form.controls.betterPlants;
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly base = toSignal(this.calendarization.calendarizeBase(), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  private readonly draft = toSignal(this.editor.form.valueChanges, { initialValue: this.editor.form.getRawValue() });
  private readonly current = computed(() => { this.draft(); this.context.report(); return this.editor.form.getRawValue(); });
  readonly analysis = computed(() => {
    const choice = this.context.analysisOptions().find(option => option.value === this.current().analysis)?.selection;
    return choice?.scope === 'facility'
      ? this.context.workspace.facilityAnalyses().find(item => item.guid === choice.analysisGuid && item.facilityId === choice.facilityGuid)
      : this.context.workspace.accountAnalyses().find(item => item.guid === choice?.analysisGuid);
  });
  readonly water = computed(() => this.analysis()?.analysisCategory === 'water');
  private readonly projection = computed(() => {
    const base = this.base(), account = this.context.workspace.account();
    if (base.state !== 'ready' || !account) return undefined;
    return this.calendarization.project(base, { context: { kind: 'account', guid: account.guid },
      energyUnit: account.energyUnit, waterUnit: account.volumeLiquidUnit, energyIsSource: true, includeEmissions: false });
  });
  readonly periodState = computed(() => this.base().state === 'ready' ? this.projection()?.state ?? 'ready' : this.base().state);
  readonly years = computed(() => {
    const account = this.context.workspace.account(), projection = this.projection();
    return account && projection?.state === 'ready' ? getYearsWithFullDataAccount([...projection.meters], account) : [];
  });
  readonly savedYearUnavailable = computed(() => {
    const year = this.current().betterPlants?.reportYear;
    return year != null && this.periodState() === 'ready' && !this.years().includes(year);
  });
  readonly baselineWarning = computed(() => {
    const analysis = this.analysis(), goals = this.context.workspace.account()?.sustainabilityQuestions;
    const enabled = this.water() ? goals?.waterReductionGoal : goals?.energyReductionGoal;
    const baseline = this.water() ? goals?.waterReductionBaselineYear : goals?.energyReductionBaselineYear;
    return enabled && analysis?.baselineYear !== baseline;
  });
  readonly fiscal = computed(() => this.context.workspace.account()?.fiscalYear === 'nonCalendarYear');
  retryPeriods(): void { this.calendarization.retry(); }
}
