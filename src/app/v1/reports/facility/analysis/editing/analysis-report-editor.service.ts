import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { FacilityReportSetupChanges } from '@data/account-workspace/facility-report-setup.models';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { SettingsDraft, settingsDraft, settingsForm } from '../analysis-report-settings';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';
export { REPORT_AUTOSAVE_DEBOUNCE_MS, ReportAutosaveState } from '@app/v1/reports/shared/editing/report-autosave-controller';

interface AnalysisReportDraft { name: string; analysis: string | null; settings: SettingsDraft; }
function reportDraft(report?: IdbFacilityReport): AnalysisReportDraft {
  return { name: report?.name ?? '', analysis: report?.analysisItemId ?? null, settings: settingsDraft(report?.analysisReportSettings) };
}

@Injectable()
export class AnalysisReportEditor {
  private readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
  private hydrated = reportDraft();
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    analysis: new FormControl<string | null>(null), settings: settingsForm()
  });
  readonly name = this.form.controls.name;
  readonly controller = new ReportAutosaveController<AnalysisReportDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? reportDraft(report) : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.read(), normalize: draft => ({ ...draft, name: draft.name.trim() }),
    valid: draft => !!draft.name.trim() && (draft.settings.reportYear == null
      || (Number.isInteger(draft.settings.reportYear) && draft.settings.reportYear >= 1800 && draft.settings.reportYear <= 9999)),
    hydrate: draft => {
      this.hydrated = draft ?? reportDraft();
      this.form.reset(this.hydrated, { emitEvent: false });
    },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async draft => {
      const report = this.context.report()!, key = this.context.key(), before = this.read();
      const changes: { name?: string; analysisItemId?: string | null; analysisReportSettings?: FacilityReportSetupChanges['analysisReportSettings'] } = {};
      if (draft.name !== this.hydrated.name) changes.name = draft.name;
      if (draft.analysis !== this.hydrated.analysis) changes.analysisItemId = draft.analysis;
      const settings = changedFields(draft.settings, this.hydrated.settings);
      if (Object.keys(settings).length) changes.analysisReportSettings = settings;
      const onlyName = changes.analysisItemId === undefined && !changes.analysisReportSettings;
      const saved = onlyName && changes.name !== undefined
        ? await this.actions.updateName(report.facilityId, report.guid, changes.name)
        : await this.actions.updateSetup(report.facilityId, report.guid, changes);
      if (key !== this.context.key()) return draft;
      const committed = reportDraft(saved), current = this.read();
      // Reconcile concurrent durable edits only where the user has not typed newer values.
      if (changes.name === undefined && current.name === before.name) this.name.setValue(committed.name, { emitEvent: false });
      if (current.analysis === before.analysis) this.form.controls.analysis.setValue(committed.analysis, { emitEvent: false });
      const rebased = rebase(current.settings, before.settings, committed.settings);
      this.form.controls.settings.reset(rebased, { emitEvent: false });
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
  readonly draft = computed(() => { this.changes(); this.context.report(); this.state(); return this.read(); });
  readonly selectedAnalysis = computed(() => this.context.workspace.facilityAnalyses().find(item =>
    item.guid === this.draft().analysis && item.facilityId === this.context.report()?.facilityId && item.accountId === this.context.workspace.account()?.guid));
  readonly setupValid = computed(() => {
    const draft = this.draft();
    if (!draft.name.trim() || ['invalid', 'error'].includes(this.state())) return false;
    const analysis = this.selectedAnalysis();
    return !!analysis && Number.isInteger(analysis.baselineYear) && draft.settings.reportYear !== null
      && draft.settings.reportYear >= analysis.baselineYear;
  });
  private read(): AnalysisReportDraft {
    return { name: this.name.value, analysis: this.form.controls.analysis.value, settings: settingsDraft(this.form.controls.settings.getRawValue()) };
  }
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
}

function equal(a: unknown, b: unknown): boolean { return JSON.stringify(a) === JSON.stringify(b); }
function changedFields<T extends object>(value: T, saved: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, field]) => equal(field, saved?.[key]) ? [] : [[key,
    key === 'analysisTableColumns' ? changedFields(field, saved?.[key]) : field]])) as Partial<T>;
}
function rebase<T extends object>(current: T, submitted: T, saved: T): T {
  return Object.fromEntries(Object.entries(saved).map(([key, value]) => [key,
    key === 'analysisTableColumns' ? rebase(current[key], submitted[key], value)
      : equal(current[key], submitted[key]) ? value : current[key]])) as T;
}
