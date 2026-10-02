import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { Months } from '@shared/form-data/months';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { RegressionCandidateStore } from './regression-candidate.store';
import { RegressionModelValidationService, modelPeriodMonthCount } from './regression-model-validation.service';
import { applySelectedRegressionModel, convertRegressionGroupToUserDefined, invalidateRegressionModel } from './regression-draft';
import type { RegressionRangeField } from './facility-analysis-regression.controller';

/** Owns regression workflow state and data transitions for one workbench group route. */
@Injectable()
export class FacilityAnalysisRegressionFacade {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly autosave = this.groupContext.autosave;
  readonly workbench = this.groupContext.workbench;
  readonly validation = inject(RegressionModelValidationService);
  private readonly candidateStore = inject(RegressionCandidateStore);
  private readonly regressionModels = inject(RegressionModelsService);
  private readonly destroyRef = inject(DestroyRef);
  private generationToken = 0;
  private generationController: AbortController | undefined;

  readonly group = this.groupContext.group;
  readonly analysis = this.autosave.draft;
  readonly months = Months;
  readonly generating = signal(false);
  readonly generationError = signal<string | undefined>(undefined);
  readonly configurationExpanded = signal(true);
  readonly generatedThisSession = signal(false);
  readonly inspectedModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly comparisonModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly recoveryNotice = signal<string | undefined>(undefined);
  readonly generatedModels = computed(() => this.candidateStore.modelsFor(
    this.workbench.analysisGuid(), this.groupContext.groupGuid()
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

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelGeneration());
  }

  changeMethod(generated: boolean): void {
    this.cancelGeneration();
    const selectedModel = generated ? undefined : this.selectedModel();
    const facility = this.workbench.facility();
    const fallbackYear = this.analysis()?.baselineYear;
    this.updateGroup(group => {
      if (!generated) {
        Object.assign(group, convertRegressionGroupToUserDefined(group, selectedModel, facility, fallbackYear));
        return;
      }
      group.isGeneratedModel = true;
      invalidateRegressionModel(group);
    }, true);
    this.clearCandidates();
    this.generationError.set(undefined);
    this.recoveryNotice.set(undefined);
  }

  setPredictorSelected(predictorId: string, selected: boolean): void {
    this.updateGroup(group => {
      const variable = group.predictorVariables.find(item => item.id === predictorId);
      if (variable) variable.productionInAnalysis = selected;
      invalidateRegressionModel(group);
      const selectedCount = group.predictorVariables.filter(item => item.productionInAnalysis).length;
      if (group.maxModelVariables > selectedCount) group.maxModelVariables = Math.max(1, selectedCount);
    }, true);
    this.clearCandidates();
  }

  changeMaxVariables(value: number): void {
    this.updateGroup(group => {
      group.maxModelVariables = value;
      invalidateRegressionModel(group);
    }, true, value > 0);
    this.clearCandidates();
  }

  setRange(field: RegressionRangeField, value: number | undefined): void {
    this.updateGroup(group => { group[field] = value; }, false, value !== undefined);
  }

  setConstant(value: number | undefined): void {
    this.updateGroup(group => { group.regressionConstant = value; }, false, value !== undefined);
  }

  setNotes(value: string): void {
    this.updateGroup(group => { group.regressionModelNotes = value; });
  }

  setCoefficient(predictorId: string, value: number | undefined): void {
    this.updateGroup(group => {
      const variable = group.predictorVariables.find(item => item.id === predictorId);
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
    this.generationController?.abort();
    const controller = new AbortController();
    this.generationController = controller;
    const priorSelectedId = group.selectedModelId;
    const priorSelectedModel = group.models?.find(model => model.modelId === priorSelectedId);
    this.generating.set(true);
    this.generationError.set(undefined);
    this.recoveryNotice.set(undefined);
    try {
      const models = await this.regressionModels.generateModels(
        structuredClone(group), structuredClone(analysis), facility,
        [...this.workbench.workspace.facilityMeters()], [...this.workbench.workspace.facilityMeterData()],
        [...this.workbench.workspace.facilityPredictorData()], account.assessmentReportVersion ?? 'AR6', controller.signal
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
    } catch (error) {
      if (token === this.generationToken && !controller.signal.aborted) {
        this.generationError.set(error instanceof Error ? error.message : 'Regression models could not be generated.');
      }
    } finally {
      if (token === this.generationToken) this.generating.set(false);
    }
  }

  selectModel(model: JStatRegressionModel): void {
    const group = this.group();
    if (group) this.replaceGroup(applySelectedRegressionModel(group, model), true);
  }

  inspectModel(model: JStatRegressionModel): void {
    const group = this.group();
    if (!group) return;
    this.comparisonModel.set(undefined);
    this.inspectedModel.set(model);
    const selectedModel = this.selectedModel();
    this.validation.inspectGenerated(group, model, selectedModel?.modelId !== model.modelId ? selectedModel : undefined);
  }

  clearReview(): void {
    this.inspectedModel.set(undefined);
    this.comparisonModel.set(undefined);
    if (this.group()?.isGeneratedModel) this.validation.clear();
  }

  private clearCandidates(): void {
    this.candidateStore.clear(this.workbench.analysisGuid(), this.groupContext.groupGuid());
    this.generatedThisSession.set(false);
    this.configurationExpanded.set(true);
  }

  private cancelGeneration(): void {
    this.generationToken += 1;
    this.generationController?.abort();
    this.generationController = undefined;
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

function sameModel(first: JStatRegressionModel, second: JStatRegressionModel): boolean {
  return first.R2 === second.R2 && first.adjust_R2 === second.adjust_R2
    && first.modelPValue === second.modelPValue
    && first.coef.length === second.coef.length
    && first.coef.every((value, index) => value === second.coef[index]);
}
