import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { defer, of } from 'rxjs';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { getYearsWithFullDataAccount } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { buildAccountEmissionFactorsInputs, calculateEmissionFactors, EmissionFactorsInput, FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { workspaceEmissionsRates } from '@app/v1/shared/calendarization/workspace-calendarization-request';
import { ReportResultController, ReportResultRequest } from '@app/v1/reports/shared/calculation/report-result-controller';
import { AccountEmissionFactorsReportEditor } from './editing/emission-factors-report-editor.service';
import { AccountEmissionFactorsReportSnapshot } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';

@Injectable()
export class AccountEmissionFactorsReportService {
  readonly editor = inject(AccountEmissionFactorsReportEditor);
  readonly context = this.editor.context;
  private readonly eGrid = inject(EGridService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly base = toSignal(this.calendarization.calendarizeBase(), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  readonly calendarizationState = computed(() => this.base().state);
  readonly years = computed(() => {
    const base = this.base(), account = this.context.workspace.account();
    if (!account || base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) return [];
    const projection = this.calendarization.project(base, { context: { kind: 'account', guid: account.guid }, includeEmissions: false });
    return projection.state === 'ready' ? getYearsWithFullDataAccount([...projection.meters], account) : [];
  });
  private readonly request = computed<ReportResultRequest<readonly FacilityEmissionFactorsResult[], readonly EmissionFactorsInput[]>>(() => {
    const context = this.context, workspace = context.workspace, report = context.report(), key = context.key();
    if (context.stage() !== 'report' || !report) return { state: { key, state: 'idle' } };
    if (workspace.status() === 'error') return { state: { key, state: 'error', message: 'The workspace could not be loaded. Reload the workspace.' } };
    if (!workspace.isReady() || workspace.hasPending() || !['idle', 'saved'].includes(this.editor.state())) {
      return { state: { key, state: 'waiting', message: 'Waiting for saved report settings and current workspace data…' } };
    }
    if (!this.editor.setupValid()) return { state: { key, state: 'error', message: 'Choose a name and a start year earlier than the end year in Setup.' } };
    const builtin = this.eGrid.builtinEmissions();
    if (builtin === undefined) return { state: { key, state: 'waiting', message: 'Waiting for emission-factor reference data…' } };
    try {
      const snapshot = workspace.snapshot()!;
      const input = buildAccountEmissionFactorsInputs(snapshot, report,
        workspaceEmissionsRates(snapshot, builtin));
      return { state: { key, state: 'ready', value: [] },
        calculation: { content: JSON.stringify([key, input]), request: input } };
    } catch (error) {
      return { state: { key, state: 'error', message: error instanceof Error ? error.message : 'Report inputs are unavailable. Return to Setup.' } };
    }
  });
  private readonly results = new ReportResultController({ request: this.request,
    loadingMessage: 'Preparing emission factors…', waitingMessage: 'Checking current report inputs…',
    execute: (inputs: readonly EmissionFactorsInput[]) => defer(() => of(inputs.map(calculateEmissionFactors))),
    project: (_value: readonly FacilityEmissionFactorsResult[], result: readonly FacilityEmissionFactorsResult[]) => result });
  readonly state = this.results.state;
  readonly exportSnapshot = computed<AccountEmissionFactorsReportSnapshot | undefined>(() => {
    const state = this.state(), report = this.context.report();
    if (state.state !== 'ready' || !state.value || !report || !this.editor.setupValid()) return undefined;
    return structuredClone({ identity: { scope: 'account' as const, accountGuid: report.accountId,
      reportGuid: report.guid }, name: report.name, accountName: this.context.workspace.account()!.name,
      startYear: report.startYear, endYear: report.endYear, results: state.value });
  });
  retry(): void { this.calendarization.retry(); this.results.retry(); }
}
