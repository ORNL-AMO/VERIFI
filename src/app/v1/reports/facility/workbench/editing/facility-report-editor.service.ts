import { Injectable, computed, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';

/** Pending facility formats preserve their existing name-only editing. */
@Injectable()
export class FacilityReportEditor {
  private readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
  readonly name = new FormControl('', { nonNullable: true });
  private readonly changes = toSignal(this.name.valueChanges, { initialValue: '' });
  private readonly controller = new ReportAutosaveController<{ name: string }>({
    key: this.context.key, saved: computed(() => { const report = this.context.report(); return report ? { name: report.name } : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.name.valueChanges,
    read: () => ({ name: this.name.value }), normalize: value => ({ name: value.name.trim() }), valid: value => !!value.name.trim(),
    hydrate: value => this.name.reset(value?.name ?? '', { emitEvent: false }),
    setEnabled: enabled => enabled ? this.name.enable({ emitEvent: false }) : this.name.disable({ emitEvent: false }),
    persist: async value => ({ name: (await this.actions.updateName(this.context.report()!.facilityId, this.context.guid(), value.name)).name })
  });
  readonly state = this.controller.state;
  readonly error = this.controller.error;
  readonly saving = this.controller.saving;
  readonly isDirty = this.controller.isDirty;
  readonly needsProtection = this.controller.needsProtection;
  readonly canEdit = this.controller.canEdit;
  readonly setupValid = computed(() => { this.changes(); return !!this.context.report() && !!this.name.value.trim() && !['invalid', 'error'].includes(this.state()); });
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
}
