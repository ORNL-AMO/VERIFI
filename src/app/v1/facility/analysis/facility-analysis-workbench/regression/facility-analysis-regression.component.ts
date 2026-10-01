import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { Months } from '@shared/form-data/months';

type ModelSort = 'adjust_R2' | 'modelYear' | 'R2' | 'modelPValue';

@Component({ selector: 'app-facility-analysis-regression', standalone: true, imports: [IconComponent], templateUrl: './facility-analysis-regression.component.html', styleUrls: ['./facility-analysis-regression.component.css'] })
export class FacilityAnalysisRegressionComponent implements OnDestroy {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly autosave = this.groupContext.autosave;
  readonly workbench = this.groupContext.workbench;
  private readonly modelState = inject(RegressionModelStateService);
  private readonly regressionModels = inject(RegressionModelsService);
  private generationToken = 0;

  readonly group = this.groupContext.group;
  readonly analysis = this.autosave.draft;
  readonly months = Months;
  readonly generating = signal(false);
  readonly generationError = signal<string | undefined>(undefined);
  readonly showInvalid = signal(false);
  readonly showFailedValidation = signal(false);
  readonly sortField = signal<ModelSort>('adjust_R2');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly inspectedModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly comparisonModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly generatedModels = computed(() => this.modelState.modelsByGroup()[this.groupContext.groupGuid()] ?? []);
  readonly selectedModel = computed(() => this.generatedModels().find(model => model.modelId === this.group()?.selectedModelId));
  readonly selectedPredictors = computed(() => this.group()?.predictorVariables.filter(variable => variable.productionInAnalysis) ?? []);
  readonly maxVariableOptions = computed(() => Array.from({ length: this.selectedPredictors().length }, (_, index) => index + 1));
  readonly yearOptions = computed(() => {
    const meterIds = new Set(this.groupContext.meters().map(meter => meter.guid));
    const years = new Set<number>();
    this.workbench.workspace.facilityMeterData().forEach(item => { if (meterIds.has(item.meterId)) years.add(item.year); });
    this.workbench.workspace.facilityPredictorData().forEach(item => years.add(item.year));
    return [...years].sort((first, second) => first - second);
  });
  readonly rangeMonths = computed(() => {
    const group = this.group();
    return group ? modelRangeMonthCount(group) : 0;
  });
  readonly generatedConfigurationValid = computed(() => this.selectedPredictors().length > 0
    && (this.group()?.maxModelVariables ?? 0) > 0
    && this.rangeMonths() >= 12);
  readonly userModelValid = computed(() => {
    const group = this.group();
    return !!group?.regressionModelYear
      && Number.isFinite(group.regressionConstant)
      && this.selectedPredictors().length > 0
      && this.selectedPredictors().every(variable => Number.isFinite(variable.regressionCoefficient));
  });
  readonly visibleModels = computed(() => {
    let models = [...this.generatedModels()];
    if (!this.showInvalid()) models = models.filter(model => model.isValid);
    if (!this.showFailedValidation()) models = models.filter(model => model.SEPValidation?.every(item => item.isValid) ?? false);
    const field = this.sortField();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return models.sort((first, second) => compareNumbers(first[field], second[field]) * direction);
  });

  private readonly seedModelState = effect(() => {
    const group = this.group();
    if (group?.models?.length && !this.modelState.modelsByGroup()[group.idbGroupId]) {
      this.modelState.setForGroup(group.idbGroupId, group.models);
    }
  });

  setMethod(event: Event): void {
    const generated = (event.target as HTMLSelectElement).value === 'generated';
    this.updateGroup(group => {
      group.isGeneratedModel = generated;
      group.models = undefined;
      group.selectedModelId = undefined;
      group.dateModelsGenerated = undefined;
      if (generated) {
        group.regressionConstant = undefined;
        group.regressionModelYear = undefined;
        group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
      }
    }, true);
    this.modelState.setForGroup(this.groupContext.groupGuid(), []);
  }

  setMaxVariables(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.updateGroup(group => { group.maxModelVariables = value; }, true, value > 0);
  }

  togglePredictor(predictorId: string): void {
    this.updateGroup(group => {
      const variable = group.predictorVariables.find(item => item.id === predictorId);
      if (variable) variable.productionInAnalysis = !variable.productionInAnalysis;
      group.models = undefined;
      group.selectedModelId = undefined;
      group.dateModelsGenerated = undefined;
    }, true);
    this.modelState.setForGroup(this.groupContext.groupGuid(), []);
  }

  setRange(field: 'regressionModelStartMonth' | 'regressionStartYear' | 'regressionModelEndMonth' | 'regressionEndYear', event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value) || undefined;
    this.updateGroup(group => { group[field] = value; }, true, !!value);
  }

  setUserValue(field: 'regressionModelYear' | 'regressionConstant' | 'regressionModelNotes', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value = field === 'regressionModelNotes' ? input.value : numericValue(input.value);
    this.updateGroup(group => { (group as any)[field] = value; }, false, field === 'regressionModelNotes' || value !== undefined);
  }

  setCoefficient(predictorId: string, event: Event): void {
    const value = numericValue((event.target as HTMLInputElement).value);
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
    if (!group || !analysis || !facility || !account || !this.generatedConfigurationValid()) return;
    const token = ++this.generationToken;
    const priorSelectedId = group.selectedModelId;
    const priorSelectedModel = group.models?.find(model => model.modelId === priorSelectedId);
    this.generating.set(true);
    this.generationError.set(undefined);
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
      this.modelState.setForGroup(group.idbGroupId, models);
      this.replaceGroup(result.updatedGroup, true);
      if (priorSelectedModel && result.newSelectedModel && !sameModel(priorSelectedModel, result.newSelectedModel)) {
        this.comparisonModel.set(priorSelectedModel);
      }
    } catch (error) {
      if (token === this.generationToken) this.generationError.set(error instanceof Error ? error.message : 'Regression models could not be generated.');
    } finally {
      if (token === this.generationToken) this.generating.set(false);
    }
  }

  selectModel(model: JStatRegressionModel): void {
    const group = this.group();
    if (!group) return;
    const updated: AnalysisGroup = {
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
    this.replaceGroup(updated, true);
    this.inspectedModel.set(undefined);
  }

  clearSelection(): void {
    this.updateGroup(group => {
      group.selectedModelId = undefined;
      group.models = undefined;
      group.regressionConstant = undefined;
      group.regressionModelYear = undefined;
      group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
    }, true);
  }

  sort(field: ModelSort): void {
    if (this.sortField() === field) this.sortDirection.update(value => value === 'asc' ? 'desc' : 'asc');
    else { this.sortField.set(field); this.sortDirection.set('desc'); }
  }

  ngOnDestroy(): void {
    this.generationToken += 1;
    this.regressionModels.terminateCurrentWorker();
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
  if (group.regressionStartYear === undefined || group.regressionModelStartMonth === undefined
    || group.regressionEndYear === undefined || group.regressionModelEndMonth === undefined) return 0;
  return (group.regressionEndYear - group.regressionStartYear) * 12
    + group.regressionModelEndMonth - group.regressionModelStartMonth + 1;
}

function numericValue(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function compareNumbers(first: number | undefined, second: number | undefined): number {
  return (first ?? Number.NEGATIVE_INFINITY) - (second ?? Number.NEGATIVE_INFINITY);
}

function sameModel(first: JStatRegressionModel, second: JStatRegressionModel): boolean {
  return first.R2 === second.R2 && first.adjust_R2 === second.adjust_R2
    && first.modelPValue === second.modelPValue
    && first.coef.length === second.coef.length
    && first.coef.every((value, index) => value === second.coef[index]);
}
