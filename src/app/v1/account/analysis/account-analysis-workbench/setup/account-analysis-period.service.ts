import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { getYearsWithFullDataAccountAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';

@Injectable()
export class AccountAnalysisPeriodService {
  private readonly context = inject(AccountAnalysisWorkbenchContext);
  private readonly autosave = inject(AccountAnalysisAutosaveService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private readonly projection = computed(() => {
    const base = this.calendarizationBase();
    const account = this.context.account();
    const analysis = this.autosave.draft();
    if (base.state !== 'ready' || !account || !analysis) return undefined;
    return this.calendarization.project(base, {
      context: { kind: 'account', guid: account.guid },
      energyUnit: analysis.energyUnit,
      waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource,
      includeEmissions: false
    });
  });

  readonly state = computed(() => {
    const base = this.calendarizationBase();
    if (base.state !== 'ready') return base.state;
    return this.projection()?.state ?? 'ready';
  });
  readonly error = computed(() => this.projection()?.error?.message
    ?? this.calendarizationBase().error?.message);
  readonly baselineYears = computed(() => {
    const analysis = this.autosave.draft();
    const account = this.context.account();
    const projection = this.projection();
    if (!analysis || !account || projection?.state !== 'ready') return [];
    return getYearsWithFullDataAccountAnalysis([...projection.meters], analysis, account);
  });
  readonly latestCompleteYear = computed(() => Math.max(...this.baselineYears(), 0) || undefined);
  readonly currentBaselineUnavailable = computed(() => {
    const baselineYear = this.autosave.draft()?.baselineYear;
    return this.state() === 'ready'
      && Number.isFinite(baselineYear)
      && !this.baselineYears().includes(Number(baselineYear));
  });
}
