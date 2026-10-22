import { Injectable, computed, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ReportAutosaveController } from '@app/v1/shared/reports/report-autosave-controller';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';
export { REPORT_AUTOSAVE_DEBOUNCE_MS, ReportAutosaveState } from '@app/v1/shared/reports/report-autosave-controller';

@Injectable()
export class FacilityReportAutosaveService {
  private readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });
  readonly controller = new ReportAutosaveController({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? { name: report.name } : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.name.valueChanges,
    read: () => ({ name: this.name.value }), normalize: draft => ({ name: draft.name.trim() }), valid: draft => !!draft.name.trim(),
    hydrate: draft => this.name.reset(draft?.name ?? '', { emitEvent: false }),
    setEnabled: enabled => enabled ? this.name.enable({ emitEvent: false }) : this.name.disable({ emitEvent: false }),
    persist: async draft => { const report = this.context.report()!; const saved = await this.actions.updateName(report.facilityId, report.guid, draft.name); return { name: saved.name }; }
  });
  readonly state = this.controller.state;
  readonly error = this.controller.error;
  readonly saving = this.controller.saving;
  readonly isDirty = this.controller.isDirty;
  readonly needsProtection = this.controller.needsProtection;
  readonly canEdit = this.controller.canEdit;
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
}
