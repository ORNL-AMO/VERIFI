import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { AccountReportSetupChanges } from '@data/account-workspace/account-report-setup.models';
import { ReportAutosaveController } from '@app/v1/shared/reports/report-autosave-controller';
import { AccountReportActionsService } from '../account-report-actions.service';
import { AccountReportWorkbenchContext } from './account-report-workbench-context.service';

export interface BetterPlantsDraft {
  reportYear: number | null;
  includePerformanceTable: boolean;
  includeFacilityNames: boolean;
  includeAllYears: boolean;
  baselineAdjustmentNotes: string;
  modificationNotes: string;
  methodologyNotes: string;
  baselineYearWaterPilotGoal: number | null;
  reportYearWaterPilotGoal: number | null;
}
interface AccountReportDraft { name: string; analysis: string | null; betterPlants?: BetterPlantsDraft; }
function betterPlantsDraft(report?: IdbAccountReport): BetterPlantsDraft {
  const setup = report?.betterPlantsReportSetup;
  return { reportYear: report?.reportYear ?? null, includePerformanceTable: setup?.includePerformanceTable ?? false,
    includeFacilityNames: setup?.includeFacilityNames ?? true, includeAllYears: setup?.includeAllYears ?? false,
    baselineAdjustmentNotes: setup?.baselineAdjustmentNotes ?? '', modificationNotes: setup?.modificationNotes ?? '',
    methodologyNotes: setup?.methodologyNotes ?? '', baselineYearWaterPilotGoal: setup?.baselineYearWaterPilotGoal ?? null,
    reportYearWaterPilotGoal: setup?.reportYearWaterPilotGoal ?? null };
}

@Injectable()
export class AccountReportAutosaveService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly actions = inject(AccountReportActionsService);
  private hydrated: AccountReportDraft = { name: '', analysis: null };
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    analysis: new FormControl<string | null>(null),
    betterPlants: new FormGroup({
      reportYear: new FormControl<number | null>(null),
      includePerformanceTable: new FormControl(false, { nonNullable: true }),
      includeFacilityNames: new FormControl(true, { nonNullable: true }),
      includeAllYears: new FormControl(false, { nonNullable: true }),
      baselineAdjustmentNotes: new FormControl('', { nonNullable: true }),
      modificationNotes: new FormControl('', { nonNullable: true }),
      methodologyNotes: new FormControl('', { nonNullable: true }),
      baselineYearWaterPilotGoal: new FormControl<number | null>(null),
      reportYearWaterPilotGoal: new FormControl<number | null>(null)
    })
  });
  readonly controller = new ReportAutosaveController<AccountReportDraft>({
    key: this.context.key,
    saved: computed(() => { const report = this.context.report(); return report ? { name: report.name, analysis: this.context.savedAnalysisValue(), ...(report.reportType === 'betterPlants' ? { betterPlants: betterPlantsDraft(report) } : {}) } : undefined; }),
    canWrite: this.context.workspace.canWrite, hasPending: this.context.workspace.hasPending, changes: this.form.valueChanges,
    read: () => ({ name: this.form.controls.name.value, analysis: this.form.controls.analysis.value,
      ...(this.context.report()?.reportType === 'betterPlants' ? { betterPlants: this.form.controls.betterPlants.getRawValue() } : {}) }),
    normalize: draft => ({ ...draft, name: draft.name.trim() }),
    valid: draft => !!draft.name.trim() && (!draft.betterPlants || validBetterPlantsDraft(draft.betterPlants)),
    hydrate: draft => { this.hydrated = draft ?? { name: '', analysis: null }; this.form.reset({ ...this.hydrated, betterPlants: this.hydrated.betterPlants ?? betterPlantsDraft() }, { emitEvent: false }); },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }),
    persist: async (draft, _saved, force) => {
      const key = this.context.key();
      const submittedRawName = this.form.controls.name.value;
      // Only explicit field edits become commands; an unrelated committed refresh must not rewrite a saved link.
      const changes: { name?: string; analysis?: AccountReportSetupChanges['analysis']; reportYear?: number | null; betterPlants?: AccountReportSetupChanges['betterPlants'] } = {};
      if (draft.name !== this.hydrated.name) changes.name = draft.name;
      if (this.context.usesAnalysis() && (force || draft.analysis !== this.hydrated.analysis)) {
        const option = this.context.analysisOptions().find(item => item.value === draft.analysis);
        if (draft.analysis && (!option || option.unavailable)) throw new Error('The selected analysis is no longer available. Choose another analysis or discard your changes.');
        changes.analysis = option?.selection ?? null;
      }
      if (draft.betterPlants && this.hydrated.betterPlants) {
        const options: Record<string, unknown> = {};
        for (const [field, value] of Object.entries(draft.betterPlants)) {
          if (value === this.hydrated.betterPlants[field]) continue;
          if (field === 'reportYear') changes.reportYear = value as number | null;
          else options[field] = value === '' ? null : value;
        }
        if (Object.keys(options).length) changes.betterPlants = options;
      }
      const saved = await this.actions.updateSetup(this.context.guid(), changes);
      if (key !== this.context.key()) return draft;
      let analysis = draft.analysis;
      // Refresh untouched controls without replacing newer input typed during this save.
      if (changes.analysis === undefined && this.form.controls.analysis.value === draft.analysis) {
        analysis = this.context.savedAnalysisValue();
        this.form.controls.analysis.setValue(analysis, { emitEvent: false });
        this.hydrated = { ...this.hydrated, analysis };
      }
      if (changes.name === undefined && this.form.controls.name.value === submittedRawName) {
        this.form.controls.name.setValue(saved.name, { emitEvent: false });
      }
      // Advance submitted fields even if newer raw edits are waiting behind this save.
      const committedBetterPlants = draft.betterPlants ? betterPlantsDraft(saved) : undefined;
      if (committedBetterPlants) {
        for (const [field, value] of Object.entries(committedBetterPlants)) {
          const control = this.form.controls.betterPlants.controls[field];
          if (control.value === draft.betterPlants[field]) control.setValue(value, { emitEvent: false });
        }
      }
      this.hydrated = { name: saved.name,
        analysis: changes.analysis !== undefined ? draft.analysis : this.hydrated.analysis,
        ...(committedBetterPlants ? { betterPlants: committedBetterPlants } : {}) };
      return { name: saved.name, analysis, ...(committedBetterPlants ? { betterPlants: committedBetterPlants } : {}) };
    }
  });
  readonly state = this.controller.state;
  readonly error = this.controller.error;
  readonly saving = this.controller.saving;
  readonly isDirty = this.controller.isDirty;
  readonly needsProtection = this.controller.needsProtection;
  readonly canEdit = this.controller.canEdit;
  private readonly draftChanges = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly setupValid = computed(() => {
    this.draftChanges();
    const state = this.state(), report = this.context.report(), draft = this.form.getRawValue();
    if (!report || !draft.name.trim() || state === 'invalid' || state === 'error') return false;
    if (this.context.findings().some(item => item.code === 'report.configuration.invalid' || item.code === 'report.dates.invalid')) return false;
    if (!this.context.usesAnalysis()) return true;
    const choice = this.context.analysisOptions().find(option => option.value === draft.analysis && !option.unavailable)?.selection;
    if (!choice || this.context.needsPairRefresh()) return false;
    if (report.reportType !== 'betterPlants') return true;
    const analysis = choice.scope === 'facility'
      ? this.context.workspace.facilityAnalyses().find(item => item.guid === choice.analysisGuid && item.facilityId === choice.facilityGuid)
      : this.context.workspace.accountAnalyses().find(item => item.guid === choice.analysisGuid);
    return validBetterPlantsDraft(draft.betterPlants)
      && Number.isInteger(analysis?.baselineYear)
      && draft.betterPlants.reportYear !== null
      && draft.betterPlants.reportYear > analysis!.baselineYear;
  });
  flush(): Promise<boolean> { return this.controller.flush(); }
  retry(): void { this.controller.retry(); }
  discard(): void { this.controller.discard(); }
  pauseAutosave(): void { this.controller.pauseAutosave(); }
  resumeAutosave(): void { this.controller.resumeAutosave(); }
  refreshLink(): void { if (this.context.needsPairRefresh() && !this.needsProtection()) this.controller.refresh(); }
}

function validBetterPlantsDraft(draft: BetterPlantsDraft): boolean {
  return (draft.reportYear === null || (Number.isInteger(draft.reportYear) && draft.reportYear >= 1800 && draft.reportYear <= 9999))
    && [draft.baselineYearWaterPilotGoal, draft.reportYearWaterPilotGoal].every(value => value === null || Number.isFinite(value));
}
