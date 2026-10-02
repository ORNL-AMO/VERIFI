import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { FiscalYearSettings, getUserDefinedModelDateRange } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { Months } from '@shared/form-data/months';
import { GeneratedModelReviewRequest, GeneratedRegressionWorkflowComponent } from './generated-regression-workflow/generated-regression-workflow.component';
import { UserDefinedRegressionWorkflowComponent, RegressionRangeField, RegressionUserField } from './user-defined-regression-workflow/user-defined-regression-workflow.component';
import { RegressionModelReviewSlideoutComponent } from './model-review-slideout/regression-model-review-slideout.component';
import { RegressionModelValidationService, modelPeriodMonthCount } from './regression-model-validation.service';
import { roundRegressionNumber } from './regression-number-format';
import { RegressionCandidateStore } from './regression-candidate.store';

@Component({
  selector: 'app-facility-analysis-regression',
  standalone: true,
  imports: [
    IconComponent,
    ConfirmationDialogComponent,
    GeneratedRegressionWorkflowComponent,
    UserDefinedRegressionWorkflowComponent,
    RegressionModelReviewSlideoutComponent
  ],
  providers: [RegressionModelValidationService],
  templateUrl: './facility-analysis-regression.component.html',
  styleUrls: ['./facility-analysis-regression.component.css']
})
export class FacilityAnalysisRegressionComponent implements OnDestroy {
  @ViewChild('confirmationModal', { static: true }) private confirmationModal!: TemplateRef<unknown>;

  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly autosave = this.groupContext.autosave;
  readonly workbench = this.groupContext.workbench;
  readonly validation = inject(RegressionModelValidationService);
  private readonly candidateStore = inject(RegressionCandidateStore);
  private readonly regressionModels = inject(RegressionModelsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private generationToken = 0;
  private reviewTrigger: HTMLElement | undefined;
  private confirmationModalOpen = false;

  readonly group = this.groupContext.group;
  readonly analysis = this.autosave.draft;
  readonly months = Months;
  readonly generating = signal(false);
  readonly generationError = signal<string | undefined>(undefined);
  readonly configurationExpanded = signal(true);
  readonly generatedThisSession = signal(false);
  readonly inspectedModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly comparisonModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly pendingMethod = signal<boolean | undefined>(undefined);
  readonly pendingPredictorId = signal<string | undefined>(undefined);
  readonly pendingMaxVariables = signal<number | undefined>(undefined);
  readonly recoveryNotice = signal<string | undefined>(undefined);
  readonly generatedModels = computed(() => this.candidateStore.modelsFor(
    this.workbench.analysisGuid(),
    this.groupContext.groupGuid()
  ));
  readonly selectedModel = computed(() => this.generatedModels().find(model => model.modelId === this.group()?.selectedModelId)
    ?? this.group()?.models?.find(model => model.modelId === this.group()?.selectedModelId));
  readonly selectedPredictors = computed(() => this.group()?.predictorVariables.filter(variable => variable.productionInAnalysis) ?? []);
  readonly maxVariableOptions = computed(() => Array.from({ length: this.selectedPredictors().length }, (_, index) => index + 1));
  readonly yearOptions = computed(() => {
    const meterIds = new Set(this.groupContext.meters().map(meter => meter.guid));
    const years = new Set<number>();
    this.workbench.workspace.facilityMeterData().forEach(item => { if (meterIds.has(item.meterId)) years.add(item.year); });
    this.workbench.workspace.facilityPredictorData().forEach(item => years.add(item.year));
    const group = this.group();
    if (Number.isFinite(group?.regressionStartYear)) years.add(group.regressionStartYear);
    if (Number.isFinite(group?.regressionEndYear)) years.add(group.regressionEndYear);
    return [...years].sort((first, second) => first - second);
  });
  readonly hasUserDefinedDataIssue = computed(() => this.groupContext.findings().some(finding => {
    const reasons = finding.evidence['reasons'];
    return Array.isArray(reasons) && reasons.includes('invalidModelDateSelection');
  }));
  readonly reviewComparisonModel = computed(() => {
    const prior = this.comparisonModel();
    if (prior) return prior;
    const inspected = this.inspectedModel();
    const selected = this.selectedModel();
    return inspected && selected?.modelId !== inspected.modelId ? selected : undefined;
  });

  private readonly seedModelState = effect(() => {
    const group = this.group();
    const analysisGuid = this.workbench.analysisGuid();
    if (group?.models?.length && this.candidateStore.modelsFor(analysisGuid, group.idbGroupId).length === 0) {
      this.candidateStore.set(analysisGuid, group.idbGroupId, group.models);
      if (group.isGeneratedModel) this.configurationExpanded.set(false);
    }
  });

  private readonly userValidationEffect = effect(() => {
    const group = this.group();
    if (group && !group.isGeneratedModel) this.validation.scheduleUserDefined(group);
    else if (!this.inspectedModel()) this.validation.clear();
  });

  requestMethod(generated: boolean): void {
    const group = this.group();
    if (!group || this.generating() || group.isGeneratedModel === generated) return;
    if (group.selectedModelId || this.generatedModels().length) {
      this.pendingMethod.set(generated);
      this.openConfirmationModal();
      return;
    }
    this.applyMethod(generated);
  }

  confirmMethodChange(): void {
    const generated = this.pendingMethod();
    this.pendingMethod.set(undefined);
    this.closeConfirmationModal();
    if (generated !== undefined) this.applyMethod(generated);
  }

  requestPredictorToggle(predictorId: string): void {
    const group = this.group();
    if (!group) return;
    if (group.isGeneratedModel && (group.selectedModelId || this.generatedModels().length)) {
      this.pendingPredictorId.set(predictorId);
      this.openConfirmationModal();
      return;
    }
    this.togglePredictor(predictorId);
  }

  confirmPredictorChange(): void {
    const predictorId = this.pendingPredictorId();
    this.pendingPredictorId.set(undefined);
    this.closeConfirmationModal();
    if (predictorId) this.togglePredictor(predictorId);
  }

  requestMaxVariables(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    const group = this.group();
    if (!group || value === group.maxModelVariables) return;
    if (group.selectedModelId || this.generatedModels().length) {
      this.pendingMaxVariables.set(value);
      this.openConfirmationModal();
      return;
    }
    this.applyMaxVariables(value);
  }

  confirmMaxVariablesChange(): void {
    const value = this.pendingMaxVariables();
    this.pendingMaxVariables.set(undefined);
    this.closeConfirmationModal();
    if (value !== undefined) this.applyMaxVariables(value);
  }

  cancelPendingConfirmation(): void {
    this.pendingMethod.set(undefined);
    this.pendingPredictorId.set(undefined);
    this.pendingMaxVariables.set(undefined);
    this.closeConfirmationModal();
  }

  setRange(change: { field: RegressionRangeField; event: Event }): void {
    const rawValue = (change.event.target as HTMLSelectElement).value;
    const value = rawValue === '' ? undefined : Number(rawValue);
    this.updateGroup(group => { group[change.field] = value; }, false, value !== undefined);
  }

  setUserValue(change: { field: RegressionUserField; event: Event }): void {
    const input = change.event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = change.field === 'regressionModelNotes' ? input.value : numericValue(input.value);
    this.updateGroup(group => { (group as any)[change.field] = value; }, false,
      change.field === 'regressionModelNotes' || value !== undefined);
  }

  setCoefficient(change: { predictorId: string; event: Event }): void {
    const value = numericValue((change.event.target as HTMLInputElement).value);
    this.updateGroup(group => {
      const variable = group.predictorVariables.find(item => item.id === change.predictorId);
      if (variable) variable.regressionCoefficient = value;
    }, false, value !== undefined);
  }

  async generateModels(): Promise<void> {
    const group = this.group();
    const analysis = this.analysis();
    const facility = this.workbench.facility();
    const account = this.workbench.account();
    if (!group || !analysis || !facility || !account || !generatedConfigurationValid(group)) return;
    const token = ++this.generationToken;
    const priorSelectedId = group.selectedModelId;
    const priorSelectedModel = group.models?.find(model => model.modelId === priorSelectedId);
    this.generating.set(true);
    this.generationError.set(undefined);
    this.recoveryNotice.set(undefined);
    try {
      const models = await this.regressionModels.generateModels(
        structuredClone(group), structuredClone(analysis), facility,
        [...this.workbench.workspace.facilityMeters()], [...this.workbench.workspace.facilityMeterData()],
        [...this.workbench.workspace.facilityPredictorData()], account.assessmentReportVersion ?? 'AR6'
      );
      if (token !== this.generationToken) return;
      const result = this.regressionModels.applyGeneratedModelsToGroup(
        group, models, priorSelectedId, priorSelectedModel, facility, analysis.baselineYear
      );
      this.candidateStore.set(this.workbench.analysisGuid(), group.idbGroupId, models);
      this.replaceGroup(result.updatedGroup, true);
      this.generatedThisSession.set(true);
      this.configurationExpanded.set(models.length === 0 || !result.updatedGroup.isGeneratedModel);
      if (!result.updatedGroup.isGeneratedModel) {
        this.recoveryNotice.set('The previous generated model was no longer available, so its equation was preserved as a user-defined model.');
      } else if (priorSelectedModel && result.newSelectedModel && !sameModel(priorSelectedModel, result.newSelectedModel)) {
        this.comparisonModel.set(priorSelectedModel);
        this.inspectedModel.set(result.newSelectedModel);
        this.validation.inspectGenerated(result.updatedGroup, result.newSelectedModel, priorSelectedModel);
      }
      queueMicrotask(() => document.getElementById('generated-models-heading')?.focus());
    } catch (error) {
      if (token === this.generationToken) this.generationError.set(error instanceof Error ? error.message : 'Regression models could not be generated.');
    } finally {
      if (token === this.generationToken) this.generating.set(false);
    }
  }

  selectModel(model: JStatRegressionModel): void {
    const group = this.group();
    if (!group) return;
    this.replaceGroup(groupWithSelectedModel(group, model), true);
    this.closeReview();
  }

  openReview(request: GeneratedModelReviewRequest): void {
    const group = this.group();
    if (!group) return;
    this.reviewTrigger = request.trigger;
    this.comparisonModel.set(undefined);
    this.inspectedModel.set(request.model);
    const selectedModel = this.selectedModel();
    this.validation.inspectGenerated(group, request.model,
      selectedModel?.modelId !== request.model.modelId ? selectedModel : undefined);
  }

  closeReview(): void {
    this.inspectedModel.set(undefined);
    this.comparisonModel.set(undefined);
    if (this.group()?.isGeneratedModel) this.validation.clear();
    const trigger = this.reviewTrigger;
    this.reviewTrigger = undefined;
    if (trigger) queueMicrotask(() => trigger.focus());
  }

  ngOnDestroy(): void {
    this.generationToken += 1;
    this.regressionModels.terminateCurrentWorker();
    this.closeConfirmationModal();
  }

  private openConfirmationModal(): void {
    this.confirmationModalOpen = true;
    this.modalPortal.show(new TemplatePortal(this.confirmationModal, this.viewContainerRef));
  }

  private closeConfirmationModal(): void {
    if (!this.confirmationModalOpen) return;
    this.confirmationModalOpen = false;
    this.modalPortal.hide();
  }

  private applyMethod(generated: boolean): void {
    this.generationToken += 1;
    this.regressionModels.terminateCurrentWorker();
    const selectedModel = generated ? undefined : this.selectedModel();
    const facility = this.workbench.facility();
    const fallbackYear = this.analysis()?.baselineYear;
    this.updateGroup(group => {
      if (!generated) {
        Object.assign(group, buildUserDefinedGroup(group, selectedModel, facility, fallbackYear));
        return;
      }
      group.isGeneratedModel = generated;
      group.models = undefined;
      group.selectedModelId = undefined;
      group.dateModelsGenerated = undefined;
      group.regressionConstant = undefined;
      group.regressionModelYear = undefined;
      group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
    }, true);
    this.candidateStore.clear(this.workbench.analysisGuid(), this.groupContext.groupGuid());
    this.generatedThisSession.set(false);
    this.configurationExpanded.set(true);
    this.generationError.set(undefined);
    this.recoveryNotice.set(undefined);
  }

  private togglePredictor(predictorId: string): void {
    this.updateGroup(group => {
      const variable = group.predictorVariables.find(item => item.id === predictorId);
      if (variable) variable.productionInAnalysis = !variable.productionInAnalysis;
      group.models = undefined;
      group.selectedModelId = undefined;
      group.dateModelsGenerated = undefined;
      const selectedCount = group.predictorVariables.filter(item => item.productionInAnalysis).length;
      if (group.maxModelVariables > selectedCount) group.maxModelVariables = Math.max(1, selectedCount);
    }, true);
    this.candidateStore.clear(this.workbench.analysisGuid(), this.groupContext.groupGuid());
    this.generatedThisSession.set(false);
    this.configurationExpanded.set(true);
  }

  private applyMaxVariables(value: number): void {
    this.updateGroup(group => {
      group.maxModelVariables = value;
      group.models = undefined;
      group.selectedModelId = undefined;
      group.dateModelsGenerated = undefined;
      group.regressionConstant = undefined;
      group.regressionModelYear = undefined;
      group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
    }, true, value > 0);
    this.candidateStore.clear(this.workbench.analysisGuid(), this.groupContext.groupGuid());
    this.generatedThisSession.set(false);
    this.configurationExpanded.set(true);
  }

  private updateGroup(update: (group: AnalysisGroup) => void, immediate = false, valid = true): void {
    const groupGuid = this.groupContext.groupGuid();
    this.autosave.update(draft => {
      const group = draft.groups.find(item => item.idbGroupId === groupGuid);
      if (group) update(group);
      draft.isAnalysisVisited = false;
    }, { immediate, valid });
  }

  private replaceGroup(updated: AnalysisGroup, immediate: boolean): void {
    this.updateGroup(group => Object.assign(group, structuredClone(updated)), immediate);
  }
}

export function modelRangeMonthCount(group: AnalysisGroup): number {
  return modelPeriodMonthCount(group);
}

export function generatedConfigurationValid(group: AnalysisGroup): boolean {
  const selected = group.predictorVariables.filter(variable => variable.productionInAnalysis).length;
  return selected > 0 && (group.maxModelVariables ?? 0) > 0 && group.maxModelVariables <= selected;
}

export function buildUserDefinedGroup(
  group: AnalysisGroup,
  selectedModel: JStatRegressionModel | undefined,
  facility: FiscalYearSettings | undefined,
  fallbackYear: number | undefined
): AnalysisGroup {
  const modelYear = selectedModel?.modelYear ?? group.regressionModelYear;
  const dateRange = getUserDefinedModelDateRange(modelYear, facility, fallbackYear);
  return {
    ...structuredClone(group),
    isGeneratedModel: false,
    selectedModelId: undefined,
    models: undefined,
    dateModelsGenerated: undefined,
    regressionModelYear: modelYear,
    regressionConstant: roundRegressionNumber(selectedModel?.coef[0] ?? group.regressionConstant),
    ...(dateRange ? {
      regressionModelStartMonth: dateRange.startMonth,
      regressionStartYear: dateRange.startYear,
      regressionModelEndMonth: dateRange.endMonth,
      regressionEndYear: dateRange.endYear
    } : {}),
    predictorVariables: group.predictorVariables.map(variable => {
      const coefficientIndex = selectedModel?.predictorVariables.findIndex(item => item.id === variable.id) ?? -1;
      const coefficient = selectedModel
        ? (coefficientIndex >= 0 ? selectedModel.coef[coefficientIndex + 1] : 0)
        : variable.regressionCoefficient;
      return { ...variable, regressionCoefficient: roundRegressionNumber(coefficient) };
    })
  };
}

function groupWithSelectedModel(group: AnalysisGroup, model: JStatRegressionModel): AnalysisGroup {
  return {
    ...structuredClone(group),
    selectedModelId: model.modelId,
    regressionConstant: model.coef[0],
    regressionModelYear: model.modelYear,
    models: [structuredClone(model)],
    predictorVariables: group.predictorVariables.map(variable => {
      const index = model.predictorVariables.findIndex(item => item.id === variable.id);
      return { ...variable, regressionCoefficient: index >= 0 ? model.coef[index + 1] : 0 };
    })
  };
}

function numericValue(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function sameModel(first: JStatRegressionModel, second: JStatRegressionModel): boolean {
  return first.R2 === second.R2 && first.adjust_R2 === second.adjust_R2
    && first.modelPValue === second.modelPValue
    && first.coef.length === second.coef.length
    && first.coef.every((value, index) => value === second.coef[index]);
}
