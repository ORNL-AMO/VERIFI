import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { FacilityReportSetupChanges } from '@data/account-workspace/facility-report-setup.models';
import { IdbFacilityReport, getModelingReportSettings } from '@data/models/idbModels/facilityReport';
import { getAllYearsWithData } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';

function reportDraft(report?: IdbFacilityReport) {
  const settings = { ...getModelingReportSettings(), ...report?.modelingReportSettings };
  return { name: report?.name ?? '', analysis: report?.analysisItemId ?? null,
    settings: { reportYear: settings.reportYear ?? null, includeIssuesSummary: settings.includeIssuesSummary,
      includeExecutiveSummary: settings.includeExecutiveSummary, includeDataValidationTables: settings.includeDataValidationTables } };
}
type ModelingDraft = ReturnType<typeof reportDraft>;

@Injectable()
export class ModelingReportEditor {
  readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
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
    saved: computed(() => { const report = this.context.report(); return report ? reportDraft(report) : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.form.getRawValue(), normalize: draft => ({ ...draft, name: draft.name.trim() }),
    valid: draft => !!draft.name.trim() && (draft.settings.reportYear === null
      || Number.isInteger(draft.settings.reportYear) && draft.settings.reportYear >= 1800 && draft.settings.reportYear <= 9999),
    hydrate: draft => { this.hydrated = draft ?? reportDraft(); this.form.reset(this.hydrated, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async draft => {
      const report = this.context.report()!, key = this.context.key(), before = this.form.getRawValue();
      const patch = Object.fromEntries(Object.entries(draft.settings).filter(([field, value]) =>
        value !== this.hydrated.settings[field])) as FacilityReportSetupChanges['modelingReportSettings'];
      const changes: FacilityReportSetupChanges = {
        ...(draft.name !== this.hydrated.name ? { name: draft.name } : {}),
        ...(draft.analysis !== this.hydrated.analysis ? { analysisItemId: draft.analysis } : {}),
        ...(Object.keys(patch).length ? { modelingReportSettings: patch } : {})
      };
      const saved = await this.actions.updateSetup(report.facilityId, report.guid, changes);
      if (this.destroy.destroyed || key !== this.context.key() || !this.context.report()) return draft;
      const committed = reportDraft(saved), current = this.form.getRawValue();
      if (current.name === before.name && changes.name === undefined) this.name.setValue(committed.name, { emitEvent: false });
      if (current.analysis === before.analysis) this.form.controls.analysis.setValue(committed.analysis, { emitEvent: false });
      const settings = Object.fromEntries(Object.entries(committed.settings).map(([field, value]) =>
        [field, current.settings[field] === before.settings[field] ? value : current.settings[field]])) as ModelingDraft['settings'];
      this.form.controls.settings.reset(settings, { emitEvent: false });
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
  readonly selectedAnalysis = computed(() => this.context.workspace.facilityAnalyses().find(item =>
    item.guid === this.draft().analysis && item.facilityId === this.context.report()?.facilityId
    && item.accountId === this.context.workspace.account()?.guid && ['energy', 'water'].includes(item.analysisCategory)));
  private readonly enabled = computed(() => this.context.report()?.facilityReportType === 'modeling');
  readonly base = toSignal(toObservable(this.enabled).pipe(switchMap(enabled => enabled
    ? this.calendarization.calendarizeBase() : of(IDLE_WORKSPACE_CALENDARIZATION))), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  readonly periodsCurrent = computed(() => this.base().state === 'ready'
    && this.base().inputFingerprint === this.calendarization.currentInputFingerprint());
  readonly periods = computed(() => {
    const base = this.base(), facility = this.context.facility(), analysis = this.selectedAnalysis();
    if (!this.periodsCurrent() || !facility) return [];
    // Year availability depends on dates and fiscal settings, not display-unit projection.
    return getAllYearsWithData([...base.meters], facility)
      .filter(year => !Number.isInteger(analysis?.baselineYear) || year >= analysis!.baselineYear);
  });
  readonly setupValid = computed(() => {
    const draft = this.draft(), analysis = this.selectedAnalysis();
    return !!this.context.report() && !!draft.name.trim() && !['invalid', 'error'].includes(this.state())
      && !!analysis && Number.isInteger(analysis.baselineYear) && analysis.baselineYear >= 1800
      && draft.settings.reportYear !== null && this.periods().includes(draft.settings.reportYear);
  });
  retryPeriods(): void { this.calendarization.retry(); }
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
}
