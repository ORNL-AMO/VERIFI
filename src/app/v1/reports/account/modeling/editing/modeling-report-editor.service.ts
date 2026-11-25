import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountReportSetupChanges } from '@data/account-workspace/account-report-setup.models';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { getAllYearsWithDataAccount } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { AccountReportActionsService } from '../../account-report-actions.service';
import { AccountAnalysisEditor } from '../../workbench/editing/account-report-editor.service';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';

function reportDraft(report?: IdbAccountReport, analysis: string | null = null) {
  return { name: report?.name ?? '', analysis, settings: {
    reportYear: report?.reportYear ?? null,
    includeIssuesSummary: report?.analysisReportSetup?.includeProblemsInformation ?? true,
    includeExecutiveSummary: report?.analysisReportSetup?.includeExecutiveSummary ?? true,
    includeDataValidationTables: report?.analysisReportSetup?.includeDataValidationTables ?? true
  } };
}
type ModelingDraft = ReturnType<typeof reportDraft>;
const contentFields = {
  includeIssuesSummary: 'includeProblemsInformation', includeExecutiveSummary: 'includeExecutiveSummary',
  includeDataValidationTables: 'includeDataValidationTables'
} as const;

@Injectable()
export class AccountModelingReportEditor implements AccountAnalysisEditor {
  readonly context = inject(AccountReportWorkbenchContext);
  private readonly actions = inject(AccountReportActionsService);
  private readonly destroy = inject(DestroyRef);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private hydrated = reportDraft();
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    analysis: new FormControl<string | null>(null),
    settings: new FormGroup({
      reportYear: new FormControl<number | null>(null),
      includeIssuesSummary: new FormControl(true, { nonNullable: true }),
      includeExecutiveSummary: new FormControl(true, { nonNullable: true }),
      includeDataValidationTables: new FormControl(true, { nonNullable: true })
    })
  });
  readonly name = this.form.controls.name;
  readonly controller = new ReportAutosaveController<ModelingDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? reportDraft(report, this.context.savedAnalysisValue()) : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.form.getRawValue(), normalize: draft => ({ ...draft, name: draft.name.trim() }),
    valid: draft => !!draft.name.trim() && (draft.settings.reportYear === null
      || Number.isInteger(draft.settings.reportYear) && draft.settings.reportYear >= 1800 && draft.settings.reportYear <= 9999),
    hydrate: draft => { this.hydrated = draft ?? reportDraft(); this.form.reset(this.hydrated, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async (draft, _saved, force) => {
      const report = this.context.report()!, key = this.context.key(), before = this.form.getRawValue();
      const modeling: AccountReportSetupChanges['modeling'] = {};
      for (const field of Object.keys(contentFields) as (keyof typeof contentFields)[]) {
        if (draft.settings[field] !== this.hydrated.settings[field]) modeling[contentFields[field]] = draft.settings[field];
      }
      let selection: AccountReportSetupChanges['analysis'];
      const select = force || draft.analysis !== this.hydrated.analysis;
      if (select) {
        const option = this.context.analysisOptions().find(item => item.value === draft.analysis);
        if (draft.analysis && (!option || option.unavailable)) throw new Error('The selected analysis is no longer available. Choose another analysis or discard your changes.');
        selection = option?.selection ?? null;
      }
      const changes: AccountReportSetupChanges = {
        ...(draft.name !== this.hydrated.name ? { name: draft.name } : {}),
        ...(select ? { analysis: selection } : {}),
        ...(draft.settings.reportYear !== this.hydrated.settings.reportYear ? { reportYear: draft.settings.reportYear } : {}),
        ...(Object.keys(modeling).length ? { modeling } : {})
      };
      const saved = await this.actions.updateSetup(report.guid, changes);
      if (this.destroy.destroyed || key !== this.context.key() || !this.context.report()) return draft;
      const committed = reportDraft(saved, this.context.savedAnalysisValue()), current = this.form.getRawValue();
      if (current.name === before.name) this.name.setValue(committed.name, { emitEvent: false });
      if (current.analysis === before.analysis) this.form.controls.analysis.setValue(committed.analysis, { emitEvent: false });
      for (const field of Object.keys(committed.settings) as (keyof ModelingDraft['settings'])[]) {
        if (current.settings[field] === before.settings[field]) {
          // The union of control value types is safe after matching the same field on both sides.
          (this.form.controls.settings.controls[field] as FormControl<number | boolean | null>).setValue(committed.settings[field], { emitEvent: false });
        }
      }
      this.hydrated = committed;
      return committed;
    }
  });
  readonly state = this.controller.state;
  readonly error = this.controller.error;
  readonly saving = this.controller.saving;
  readonly isDirty = this.controller.isDirty;
  readonly needsProtection = this.controller.needsProtection;
  readonly canEdit = this.controller.canEdit;
  private readonly changes = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly draft = computed(() => { this.changes(); this.context.report(); this.state(); return this.form.getRawValue(); });
  readonly selectedAnalysis = computed(() => {
    const choice = this.context.analysisOptions().find(item => item.value === this.draft().analysis && !item.unavailable)?.selection;
    return choice?.scope === 'facility'
      ? this.context.workspace.facilityAnalyses().find(item => item.guid === choice.analysisGuid && item.facilityId === choice.facilityGuid)
      : this.context.workspace.accountAnalyses().find(item => item.guid === choice?.analysisGuid);
  });
  readonly base = toSignal(this.calendarization.calendarizeBase(), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  readonly periodsCurrent = computed(() => this.base().state === 'ready'
    && this.base().inputFingerprint === this.calendarization.currentInputFingerprint());
  readonly periods = computed(() => {
    const account = this.context.workspace.account(), analysis = this.selectedAnalysis();
    return this.periodsCurrent() && account ? getAllYearsWithDataAccount([...this.base().meters], account)
      .filter(year => !Number.isInteger(analysis?.baselineYear) || year >= analysis!.baselineYear) : [];
  });
  readonly setupValid = computed(() => {
    const draft = this.draft(), analysis = this.selectedAnalysis();
    return !!this.context.report() && !!draft.name.trim() && !['invalid', 'error'].includes(this.state())
      && !!analysis && Number.isInteger(analysis.baselineYear) && analysis.baselineYear >= 1800 && analysis.baselineYear <= 9999
      && !this.context.needsPairRefresh() && draft.settings.reportYear !== null && this.periods().includes(draft.settings.reportYear);
  });
  retryPeriods(): void { this.calendarization.retry(); }
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
  beginDeletion(): Promise<boolean> { return this.controller.beginDeletion(); }
  cancelDeletion(): void { this.controller.cancelDeletion(); }
  completeDeletion(): void { this.controller.completeDeletion(); }
  refreshLink(): void { if (this.context.needsPairRefresh() && !this.needsProtection()) this.controller.refresh(); }
}
