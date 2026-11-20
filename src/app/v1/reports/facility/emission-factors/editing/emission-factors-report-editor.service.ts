import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { FacilityReportSetupChanges } from '@data/account-workspace/facility-report-setup.models';
import { validEmissionFactorYear, validEmissionFactorsPeriod } from '@domain/reports/emission-factors/emission-factors-period';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';

function reportDraft(report?: IdbFacilityReport) {
  return { name: report?.name ?? '', settings: {
    startYear: report?.emissionFactorsReportSettings?.startYear ?? null,
    endYear: report?.emissionFactorsReportSettings?.endYear ?? null
  } };
}
type EmissionFactorsDraft = ReturnType<typeof reportDraft>;

@Injectable()
export class EmissionFactorsReportEditor {
  readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
  private readonly destroy = inject(DestroyRef);
  private hydrated = reportDraft();
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    settings: new FormGroup({ startYear: new FormControl<number | null>(null), endYear: new FormControl<number | null>(null) })
  });
  readonly name = this.form.controls.name;
  private readonly controller = new ReportAutosaveController<EmissionFactorsDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? reportDraft(report) : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.form.getRawValue(), normalize: draft => ({ ...draft, name: draft.name.trim() }),
    valid: draft => !!draft.name.trim() && Object.values(draft.settings).every(year => year === null || validEmissionFactorYear(year)),
    hydrate: draft => { this.hydrated = draft ?? reportDraft(); this.form.reset(this.hydrated, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async draft => {
      const report = this.context.report()!, key = this.context.key(), before = this.form.getRawValue();
      const settings: FacilityReportSetupChanges['emissionFactorsReportSettings'] = {
        ...(draft.settings.startYear !== this.hydrated.settings.startYear ? { startYear: draft.settings.startYear } : {}),
        ...(draft.settings.endYear !== this.hydrated.settings.endYear ? { endYear: draft.settings.endYear } : {})
      };
      const changes: FacilityReportSetupChanges = {
        ...(draft.name !== this.hydrated.name ? { name: draft.name } : {}),
        ...(Object.keys(settings).length ? { emissionFactorsReportSettings: settings } : {})
      };
      const saved = await this.actions.updateSetup(report.facilityId, report.guid, changes);
      if (this.destroy.destroyed || key !== this.context.key() || !this.context.report()) return draft;
      const committed = reportDraft(saved), current = this.form.getRawValue();
      this.form.reset({
        name: current.name === before.name ? committed.name : current.name,
        settings: {
          startYear: current.settings.startYear === before.settings.startYear ? committed.settings.startYear : current.settings.startYear,
          endYear: current.settings.endYear === before.settings.endYear ? committed.settings.endYear : current.settings.endYear
        }
      }, { emitEvent: false });
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
  readonly setupValid = computed(() => !!this.context.report() && !!this.draft().name.trim()
    && validEmissionFactorsPeriod(this.draft().settings) && !['invalid', 'error'].includes(this.state()));
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
}
