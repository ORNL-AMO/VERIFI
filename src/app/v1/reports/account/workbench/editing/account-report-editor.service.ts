import { InjectionToken, Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountReportSetupChanges } from '@data/account-workspace/account-report-setup.models';
import { ReportAutosaveController } from '@app/v1/reports/shared/editing/report-autosave-controller';
import { ReportEditor } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { AccountReportActionsService } from '../../account-report-actions.service';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';

export interface AccountAnalysisEditor extends ReportEditor {
  readonly form: { readonly controls: { readonly name: FormControl<string>; readonly analysis: FormControl<string | null> } };
  refreshLink(): void;
}
export const ACCOUNT_ANALYSIS_EDITOR = new InjectionToken<AccountAnalysisEditor>('Account report analysis editor');
interface AccountDraft { name: string; analysis: string | null; }

/** Supported editing for account formats whose report content is still pending. */
@Injectable()
export class AccountReportEditor implements AccountAnalysisEditor {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly actions = inject(AccountReportActionsService);
  private hydrated: AccountDraft = { name: '', analysis: null };
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    analysis: new FormControl<string | null>(null)
  });
  readonly name = this.form.controls.name;
  private readonly controller = new ReportAutosaveController<AccountDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? { name: report.name, analysis: this.context.savedAnalysisValue() } : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => this.form.getRawValue(), normalize: value => ({ ...value, name: value.name.trim() }), valid: value => !!value.name.trim(),
    hydrate: value => { this.hydrated = value ?? { name: '', analysis: null }; this.form.reset(this.hydrated, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async (draft, _saved, force) => {
      const key = this.context.key(), rawName = this.name.value;
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
      if (changes.analysis === undefined && this.form.controls.analysis.value === draft.analysis) {
        analysis = this.context.savedAnalysisValue();
        this.form.controls.analysis.setValue(analysis, { emitEvent: false });
      }
      if (changes.name === undefined && this.name.value === rawName) this.name.setValue(saved.name, { emitEvent: false });
      this.hydrated = { name: saved.name, analysis: changes.analysis !== undefined ? draft.analysis : analysis };
      return { name: saved.name, analysis };
    }
  });
  readonly state = this.controller.state;
  readonly error = this.controller.error;
  readonly saving = this.controller.saving;
  readonly isDirty = this.controller.isDirty;
  readonly needsProtection = this.controller.needsProtection;
  readonly canEdit = this.controller.canEdit;
  private readonly changes = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly setupValid = computed(() => {
    this.changes();
    if (!this.context.report() || !this.name.value.trim() || ['invalid', 'error'].includes(this.state())) return false;
    if (this.context.findings().some(item => item.code === 'report.configuration.invalid' || item.code === 'report.dates.invalid')) return false;
    return !this.context.usesAnalysis() || (!this.context.needsPairRefresh()
      && this.context.analysisOptions().some(item => item.value === this.form.controls.analysis.value && !item.unavailable));
  });
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
  refreshLink(): void { if (this.context.needsPairRefresh() && !this.needsProtection()) this.controller.refresh(); }
}
