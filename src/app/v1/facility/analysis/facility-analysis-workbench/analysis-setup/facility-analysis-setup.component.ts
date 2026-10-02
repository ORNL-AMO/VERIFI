import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EnergyUnitOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { invalidateAllRegressionModels } from '../group/regression/regression-draft';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilityAnalysisPeriodService } from './facility-analysis-period.service';

@Component({
  selector: 'app-facility-analysis-setup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ConfirmationDialogComponent],
  templateUrl: './facility-analysis-setup.component.html',
  styleUrls: ['./facility-analysis-setup.component.css']
})
export class FacilityAnalysisSetupComponent implements OnDestroy {
  @ViewChild('clearModelsModal', { static: true }) private clearModelsModal!: TemplateRef<unknown>;

  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  private readonly period = inject(FacilityAnalysisPeriodService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  readonly showClearModels = signal(false);
  readonly energyUnits = EnergyUnitOptions;
  readonly waterUnits = VolumeLiquidOptions;
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]
    }),
    energyIsSource: new FormControl(false, { nonNullable: true }),
    energyUnit: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    waterUnit: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    baselineYear: new FormControl<number | null>(null, { validators: [Validators.required] }),
    hasBanking: new FormControl(false, { nonNullable: true }),
    bankedAnalysisItemId: new FormControl<string | null>(null)
  });
  readonly draft = this.autosave.draft;
  readonly baselineYears = this.period.baselineYears;
  readonly latestCompleteYear = this.period.latestCompleteYear;
  readonly hasModels = computed(() => this.draft()?.groups.some(group => (group.models?.length ?? 0) > 0) ?? false);
  readonly baselineGoalWarning = computed(() => {
    const analysis = this.draft();
    const facility = this.context.facility();
    if (!analysis || !facility || !analysis.baselineYear) return undefined;
    const questions = facility.sustainabilityQuestions;
    const goal = analysis.analysisCategory === 'water' ? questions.waterReductionGoal : questions.energyReductionGoal;
    const goalYear = analysis.analysisCategory === 'water' ? questions.waterReductionBaselineYear : questions.energyReductionBaselineYear;
    return goal && goalYear !== analysis.baselineYear
      ? `This baseline does not match the facility ${analysis.analysisCategory} goal baseline (${goalYear}). Goal reports cannot use this analysis until they match.`
      : undefined;
  });
  readonly eligibleBankingSources = computed(() => {
    const analysis = this.draft();
    return analysis ? compatibleBankingSources(analysis, this.context.analyses()) : [];
  });

  constructor() {
    effect(() => this.syncForm());
    const controls = this.form.controls;
    controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(name => {
      this.autosave.update(draft => { draft.name = name; }, { valid: controls.name.valid });
    });
    controls.energyIsSource.valueChanges.pipe(takeUntilDestroyed()).subscribe(energyIsSource => {
      if (this.hasModels()) return;
      controls.bankedAnalysisItemId.setValue(null, { emitEvent: false });
      this.autosave.update(draft => {
        draft.energyIsSource = energyIsSource;
        draft.bankedAnalysisItemId = undefined;
      }, { immediate: true });
    });
    controls.energyUnit.valueChanges.pipe(takeUntilDestroyed()).subscribe(energyUnit => {
      if (this.hasModels()) return;
      this.autosave.update(draft => { draft.energyUnit = energyUnit; }, { immediate: true, valid: controls.energyUnit.valid });
    });
    controls.waterUnit.valueChanges.pipe(takeUntilDestroyed()).subscribe(waterUnit => {
      if (this.hasModels()) return;
      this.autosave.update(draft => { draft.waterUnit = waterUnit; }, { immediate: true, valid: controls.waterUnit.valid });
    });
    controls.baselineYear.valueChanges.pipe(takeUntilDestroyed()).subscribe(baselineYear => {
      if (this.hasModels() || baselineYear === null) return;
      this.autosave.update(draft => { draft.baselineYear = baselineYear; }, {
        immediate: true,
        valid: controls.baselineYear.valid
      });
    });
    controls.hasBanking.valueChanges.pipe(takeUntilDestroyed()).subscribe(hasBanking => {
      if (!hasBanking) controls.bankedAnalysisItemId.setValue(null, { emitEvent: false });
      this.autosave.update(draft => {
        draft.hasBanking = hasBanking;
        if (!hasBanking) draft.bankedAnalysisItemId = undefined;
      }, { immediate: true });
    });
    controls.bankedAnalysisItemId.valueChanges.pipe(takeUntilDestroyed()).subscribe(bankedAnalysisItemId => {
      this.autosave.update(draft => {
        draft.bankedAnalysisItemId = bankedAnalysisItemId || undefined;
      }, { immediate: true, valid: controls.bankedAnalysisItemId.valid });
    });
  }

  clearModels(): void {
    this.autosave.update(invalidateAllRegressionModels, { immediate: true });
    this.closeClearModels();
  }

  requestClearModels(): void {
    this.showClearModels.set(true);
    this.modalPortal.show(new TemplatePortal(this.clearModelsModal, this.viewContainerRef));
  }

  closeClearModels(): void {
    if (!this.showClearModels()) return;
    this.showClearModels.set(false);
    this.modalPortal.hide();
  }

  ngOnDestroy(): void {
    this.closeClearModels();
  }

  private syncForm(): void {
    const analysis = this.draft();
    const hasModels = this.hasModels();
    const baselineYears = this.baselineYears();
    const hasBankingSources = this.eligibleBankingSources().length > 0;
    if (!analysis) {
      this.form.disable({ emitEvent: false });
      return;
    }

    syncControlValue(this.form.controls.name, analysis.name);
    syncControlValue(this.form.controls.energyIsSource, analysis.energyIsSource);
    syncControlValue(this.form.controls.energyUnit, analysis.energyUnit);
    syncControlValue(this.form.controls.waterUnit, analysis.waterUnit);
    // Reapply this value when the async year options change so the select accessor can match it.
    syncControlValue(this.form.controls.baselineYear, analysis.baselineYear || null, true);
    syncControlValue(this.form.controls.hasBanking, analysis.hasBanking);
    syncControlValue(this.form.controls.bankedAnalysisItemId, analysis.bankedAnalysisItemId || null);

    setControlDisabled(this.form.controls.energyIsSource, hasModels);
    setControlDisabled(this.form.controls.energyUnit, hasModels);
    setControlDisabled(this.form.controls.waterUnit, hasModels);
    setControlDisabled(this.form.controls.baselineYear, hasModels || baselineYears.length === 0);
    setControlDisabled(this.form.controls.hasBanking, !hasBankingSources);
    setControlDisabled(this.form.controls.name, false);
    setControlDisabled(this.form.controls.bankedAnalysisItemId, !analysis.hasBanking);
    this.form.controls.bankedAnalysisItemId.setValidators(analysis.hasBanking ? [Validators.required] : []);
    this.form.controls.bankedAnalysisItemId.updateValueAndValidity({ emitEvent: false });
  }
}

function setControlDisabled(control: AbstractControl, disabled: boolean): void {
  if (disabled && control.enabled) control.disable({ emitEvent: false });
  if (!disabled && control.disabled) control.enable({ emitEvent: false });
}

function syncControlValue<T>(control: FormControl<T>, value: T, force = false): void {
  if (force || !Object.is(control.value, value)) control.setValue(value, { emitEvent: false });
}

export function compatibleBankingSources(
  analysis: IdbAnalysisItem,
  candidates: readonly IdbAnalysisItem[]
): readonly IdbAnalysisItem[] {
  return candidates.filter(candidate => candidate.guid !== analysis.guid
    && candidate.facilityId === analysis.facilityId
    && candidate.analysisCategory === analysis.analysisCategory
    && (analysis.analysisCategory === 'water' || candidate.energyIsSource === analysis.energyIsSource));
}
