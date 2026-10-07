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
import { BankingSourceOption, bankingSourceOptions } from '../banking/facility-analysis-banking';
import { AnalysisGroup, AnalysisType, JStatRegressionModel } from '@data/models/analysis';

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
  readonly bankingSources = computed(() => {
    const analysis = this.draft();
    return analysis ? bankingSourceOptions(analysis, this.context.analyses(), this.context.status.items()) : [];
  });
  readonly bankingSourceCards = computed<readonly BankingSourceCardView[]>(() => this.bankingSources().map(option => ({
    ...option,
    groupDetails: bankingSourceGroupViews(option, this.context.meterGroups())
  })));
  readonly availableBankingSources = computed(() => this.bankingSourceCards().filter(option => option.validation !== 'unavailable'));
  readonly unavailableBankingSources = computed(() => this.bankingSourceCards().filter(option => option.validation === 'unavailable'));
  readonly selectedBankingSourceBlocked = computed(() => {
    const selected = this.draft()?.bankedAnalysisItemId;
    return !!selected && this.bankingSourceCards().some(option => option.analysis.guid === selected && option.validation === 'unavailable');
  });

  constructor() {
    effect(() => this.syncForm());
    const controls = this.form.controls;
    controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(name => {
      this.updateAnalysis(draft => { draft.name = name; });
    });
    controls.energyIsSource.valueChanges.pipe(takeUntilDestroyed()).subscribe(energyIsSource => {
      if (this.hasModels()) return;
      controls.bankedAnalysisItemId.setValue(null, { emitEvent: false });
      this.updateAnalysis(draft => {
        draft.energyIsSource = energyIsSource;
        draft.bankedAnalysisItemId = undefined;
      }, true);
    });
    controls.energyUnit.valueChanges.pipe(takeUntilDestroyed()).subscribe(energyUnit => {
      if (this.hasModels()) return;
      this.updateAnalysis(draft => { draft.energyUnit = energyUnit; }, true);
    });
    controls.waterUnit.valueChanges.pipe(takeUntilDestroyed()).subscribe(waterUnit => {
      if (this.hasModels()) return;
      this.updateAnalysis(draft => { draft.waterUnit = waterUnit; }, true);
    });
    controls.baselineYear.valueChanges.pipe(takeUntilDestroyed()).subscribe(baselineYear => {
      if (this.hasModels() || baselineYear === null) return;
      this.updateAnalysis(draft => { draft.baselineYear = baselineYear; }, true);
    });
    controls.hasBanking.valueChanges.pipe(takeUntilDestroyed()).subscribe(hasBanking => {
      if (!hasBanking) controls.bankedAnalysisItemId.setValue(null, { emitEvent: false });
      this.updateAnalysis(draft => {
        draft.hasBanking = hasBanking;
        if (!hasBanking) draft.bankedAnalysisItemId = undefined;
      }, true);
    });
    controls.bankedAnalysisItemId.valueChanges.pipe(takeUntilDestroyed()).subscribe(bankedAnalysisItemId => {
      this.updateAnalysis(draft => {
        draft.bankedAnalysisItemId = bankedAnalysisItemId || undefined;
      }, true);
    });
  }

  clearModels(): void {
    this.updateAnalysis(invalidateAllRegressionModels, true);
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

  private updateAnalysis(update: (draft: IdbAnalysisItem) => void, immediate = false): void {
    this.autosave.update(update, { immediate, valid: analysisSetupDraftValid });
  }

  private syncForm(): void {
    const analysis = this.draft();
    const hasModels = this.hasModels();
    const baselineYears = this.baselineYears();
    const hasBankingSources = this.availableBankingSources().length > 0;
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
    setControlDisabled(this.form.controls.hasBanking, hasModels || (!hasBankingSources && !analysis.hasBanking));
    setControlDisabled(this.form.controls.name, false);
    setControlDisabled(this.form.controls.bankedAnalysisItemId, hasModels || !analysis.hasBanking);
    this.form.controls.bankedAnalysisItemId.setValidators(analysis.hasBanking ? [Validators.required] : []);
    this.form.controls.bankedAnalysisItemId.updateValueAndValidity({ emitEvent: false });
  }
}

export function analysisMethodLabel(type: AnalysisType): string {
  if (type === 'absoluteEnergyConsumption') return 'Absolute consumption';
  if (type === 'energyIntensity') return 'Classic intensity';
  if (type === 'modifiedEnergyIntensity') return 'Modified intensity';
  if (type === 'regression') return 'Regression';
  return 'Skipped';
}

export interface BankingSourceGroupView {
  readonly groupGuid: string;
  readonly name: string;
  readonly analysisMethod: string;
  readonly predictors: readonly string[];
  readonly regression?: {
    readonly equation: string;
    readonly modelYear: string;
    readonly adjustedR2: string;
  };
}

interface BankingSourceCardView extends BankingSourceOption {
  readonly groupDetails: readonly BankingSourceGroupView[];
}

export function bankingSourceGroupViews(
  option: BankingSourceOption,
  meterGroups: readonly { readonly guid: string; readonly name: string }[]
): readonly BankingSourceGroupView[] {
  const groupNames = new Map(meterGroups.map(group => [group.guid, group.name]));
  return option.usableGroups.map(group => {
    const selectedModel = group.models?.find(model => model.modelId === group.selectedModelId);
    const predictors = selectedModel?.predictorVariables
      ?? group.predictorVariables.filter(variable => variable.productionInAnalysis);
    return {
      groupGuid: group.idbGroupId,
      name: groupNames.get(group.idbGroupId) ?? group.idbGroupId,
      analysisMethod: analysisMethodLabel(group.analysisType),
      predictors: predictors.map(variable => variable.name),
      regression: group.analysisType === 'regression' ? {
        equation: regressionEquation(group, selectedModel),
        modelYear: formatModelYear(selectedModel?.modelYear ?? group.regressionModelYear),
        adjustedR2: formatRegressionValue(selectedModel?.adjust_R2, 3)
      } : undefined
    };
  });
}

function regressionEquation(group: AnalysisGroup, selectedModel: JStatRegressionModel | undefined): string {
  if (selectedModel) {
    return [
      formatRegressionValue(selectedModel.coef?.[0]),
      ...selectedModel.predictorVariables.map((variable, index) =>
        `(${formatRegressionValue(selectedModel.coef?.[index + 1])} × ${variable.name})`)
    ].join(' + ');
  }
  return [
    formatRegressionValue(group.regressionConstant),
    ...group.predictorVariables
      .filter(variable => variable.productionInAnalysis)
      .map(variable => `(${formatRegressionValue(variable.regressionCoefficient)} × ${variable.name})`)
  ].join(' + ');
}

function formatModelYear(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : '—';
}

function formatRegressionValue(value: number | undefined, fractionDigits?: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toLocaleString(undefined, fractionDigits === undefined
    ? { maximumSignificantDigits: 6 }
    : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
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

export function analysisSetupDraftValid(analysis: IdbAnalysisItem): boolean {
  return analysis.name.trim().length > 0
    && analysis.name.length <= 120
    && analysis.energyUnit.trim().length > 0
    && analysis.waterUnit.trim().length > 0
    && Number.isFinite(analysis.baselineYear)
    && (!analysis.hasBanking || !!analysis.bankedAnalysisItemId?.trim());
}
