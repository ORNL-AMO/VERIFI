import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { DataQualityReportSetupChanges, FacilityReportSetupChanges } from '@data/account-workspace/facility-report-setup.models';
import { resolveDataQualitySelection } from '@domain/reports/data-quality-report-selection';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';
import { DataQualitySettingsDraft, METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS, dataQualitySettingsDraft, dataQualitySettingsForm } from '../data-quality-report-settings';

interface DataQualityDraft { name: string; settings: DataQualitySettingsDraft; }
function reportDraft(report?: IdbFacilityReport): DataQualityDraft {
  return { name: report?.name ?? '', settings: dataQualitySettingsDraft(report?.dataQualityReportSettings) };
}

@Injectable()
export class DataQualityReportEditor {
  readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
  private readonly destroy = inject(DestroyRef);
  private hydrated = reportDraft();
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    settings: dataQualitySettingsForm()
  });
  readonly name = this.form.controls.name;
  readonly controller = new ReportAutosaveController<DataQualityDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? reportDraft(report) : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.read(), normalize: draft => ({ ...draft, name: draft.name.trim() }),
    // A missing selection is a valid saved draft, but cannot advance to Report.
    valid: draft => !!draft.name.trim(),
    hydrate: draft => { this.hydrated = draft ?? reportDraft(); this.form.reset(this.hydrated, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async draft => {
      const report = this.context.report()!, key = this.context.key(), before = this.read();
      const patch = Object.fromEntries(Object.entries(draft.settings).filter(([field, value]) =>
        !equal(value, this.hydrated.settings[field]))) as DataQualityReportSetupChanges;
      const changes: FacilityReportSetupChanges = {
        ...(draft.name !== this.hydrated.name ? { name: draft.name } : {}),
        ...(Object.keys(patch).length ? { dataQualityReportSettings: patch } : {})
      };
      const saved = await this.actions.updateSetup(report.facilityId, report.guid, changes);
      if (this.destroy.destroyed || key !== this.context.key() || !this.context.report()) return draft;
      const committed = reportDraft(saved), current = this.read();
      // Keep edits made while saving; merge durable changes only into unchanged fields.
      if (current.name === before.name && changes.name === undefined) this.name.setValue(committed.name, { emitEvent: false });
      const rebased = Object.fromEntries(Object.entries(committed.settings).map(([field, value]) =>
        [field, equal(current.settings[field], before.settings[field]) ? value : current.settings[field]])) as DataQualitySettingsDraft;
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
  readonly selection = computed(() => resolveDataQualitySelection({
    accountGuid: this.context.workspace.account()?.guid ?? '', facilityGuid: this.context.report()?.facilityId ?? '',
    settings: this.draft().settings,
    facilityAnalyses: this.context.workspace.facilityAnalyses(), meters: this.context.workspace.meters(), predictors: this.context.workspace.predictors()
  }));
  readonly setupValid = computed(() => !!this.context.report() && !!this.draft().name.trim()
    && !['invalid', 'error'].includes(this.state()) && this.selection().valid);

  constructor() {
    const controls = this.form.controls.settings.controls;
    controls.selectedMode.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.form.controls.settings.patchValue({ selectedAnalysisItemId: null, selectedMeterIds: [], selectedPredictorIds: [] }, { emitEvent: false });
    });
    controls.includeMeter.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      for (const key of METER_CONTENT_FLAGS) controls[key].setValue(value, { emitEvent: false });
    });
    controls.includePredictors.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      for (const key of PREDICTOR_CONTENT_FLAGS) controls[key].setValue(value, { emitEvent: false });
    });
    for (const key of METER_CONTENT_FLAGS) controls[key].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      controls.includeMeter.setValue(METER_CONTENT_FLAGS.every(flag => controls[flag].value), { emitEvent: false });
    });
    for (const key of PREDICTOR_CONTENT_FLAGS) controls[key].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      controls.includePredictors.setValue(PREDICTOR_CONTENT_FLAGS.every(flag => controls[flag].value), { emitEvent: false });
    });
  }
  private read(): DataQualityDraft { return this.form.getRawValue(); }
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
}

function equal(first: unknown, second: unknown): boolean { return JSON.stringify(first) === JSON.stringify(second); }
