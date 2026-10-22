import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AccountReportSetupChanges } from '@data/account-workspace/account-report-setup.models';
import { ReportAutosaveController } from '@app/v1/shared/reports/report-autosave-controller';
import { AccountReportActionsService } from '../account-report-actions.service';
import { AccountReportWorkbenchContext } from './account-report-workbench-context.service';

interface AccountReportDraft { name: string; analysis: string | null; }
@Injectable()
export class AccountReportAutosaveService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly actions = inject(AccountReportActionsService);
  private hydrated: AccountReportDraft = { name: '', analysis: null };
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    analysis: new FormControl<string | null>(null)
  });
  readonly controller = new ReportAutosaveController<AccountReportDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? { name: report.name, analysis: this.context.savedAnalysisValue() } : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.form.getRawValue(), normalize: draft => ({ ...draft, name: draft.name.trim() }), valid: draft => !!draft.name.trim(),
    hydrate: draft => { this.hydrated = draft ?? { name: '', analysis: null }; this.form.reset(this.hydrated, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async (draft, _saved, force) => {
      const key = this.context.key();
      // Only explicit field edits become commands; an unrelated committed refresh must not rewrite a saved link.
      const changes: { name?: string; analysis?: AccountReportSetupChanges['analysis'] } = {};
      if (draft.name !== this.hydrated.name) changes.name = draft.name;
      if (this.context.usesAnalysis() && (force || draft.analysis !== this.hydrated.analysis)) {
        const option = this.context.analysisOptions().find(item => item.value === draft.analysis);
        if (draft.analysis && (!option || option.unavailable)) throw new Error('The selected analysis is no longer available. Choose another analysis or discard your changes.');
        changes.analysis = option?.selection ?? null;
      }
      const saved = await this.actions.updateSetup(this.context.guid(), changes);
      if (key !== this.context.key()) return draft;
      let analysis = draft.analysis;
      let name = changes.name !== undefined ? saved.name : draft.name;
      // Refresh untouched controls without replacing newer input typed during this save.
      if (changes.analysis === undefined && this.form.controls.analysis.value === draft.analysis) {
        analysis = this.context.savedAnalysisValue();
        this.form.controls.analysis.setValue(analysis, { emitEvent: false });
        this.hydrated = { ...this.hydrated, analysis };
      }
      if (changes.name === undefined && this.form.controls.name.value === draft.name) {
        name = saved.name;
        this.form.controls.name.setValue(name, { emitEvent: false });
        this.hydrated = { ...this.hydrated, name };
      }
      // Advance submitted fields even if newer raw edits are waiting behind this save.
      this.hydrated = { name: changes.name !== undefined ? saved.name : this.hydrated.name,
        analysis: changes.analysis !== undefined ? draft.analysis : this.hydrated.analysis };
      return { name, analysis };
    }
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
  refreshLink(): void { if (this.context.needsPairRefresh() && !this.needsProtection()) this.controller.refresh(); }
}
