import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { JStatRegressionModel } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';

type ModelSort = 'adjust_R2' | 'modelYear' | 'R2' | 'modelPValue';

interface GeneratedModelRow {
  readonly model: JStatRegressionModel;
  readonly predictorSummary: string;
  readonly equation: string;
  readonly criticalIssues: readonly string[];
  readonly validationIssues: readonly string[];
  readonly valid: boolean;
}

@Component({
  selector: 'app-generated-regression-workflow',
  standalone: true,
  imports: [IconComponent, ReactiveFormsModule],
  templateUrl: './generated-regression-workflow.component.html',
  styleUrls: ['./generated-regression-workflow.component.css']
})
export class GeneratedRegressionWorkflowComponent {
  readonly workflow = inject(FacilityAnalysisRegressionFacade);
  readonly controller = inject(FacilityAnalysisRegressionController);
  readonly group = this.workflow.group;
  readonly models = this.workflow.generatedModels;
  readonly generating = this.workflow.generating;
  readonly generationError = this.workflow.generationError;
  readonly configurationExpanded = this.workflow.configurationExpanded;
  readonly generatedThisSession = this.workflow.generatedThisSession;
  readonly maxVariableOptions = this.workflow.maxVariableOptions;
  readonly sortField = signal<ModelSort>('adjust_R2');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly selectedPredictors = computed(() => this.group().predictorVariables.filter(variable => variable.productionInAnalysis));
  readonly modelYears = computed(() => [...new Set(this.models().map(model => model.modelYear))]
    .filter((year): year is number => Number.isFinite(year))
    .sort((first, second) => second - first));
  readonly canGenerate = computed(() => {
    const maximum = this.group().maxModelVariables ?? 0;
    return this.selectedPredictors().length > 0 && maximum > 0 && maximum <= this.selectedPredictors().length;
  });
  readonly generationSummary = computed(() => {
    const group = this.group();
    const generated = group.dateModelsGenerated ? new Date(group.dateModelsGenerated).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }) : undefined;
    const predictors = this.selectedPredictors().map(predictor => predictor.name).join(', ') || 'No predictors selected';
    return `${predictors} · maximum ${group.maxModelVariables ?? 0} variable${group.maxModelVariables === 1 ? '' : 's'}${generated ? ` · generated ${generated}` : ''}`;
  });
  readonly persistedSelectionOnly = computed(() => !this.generatedThisSession()
    && this.models().length === 1
    && this.models()[0].modelId === this.group().selectedModelId);
  readonly rows = computed<readonly GeneratedModelRow[]>(() => {
    let models = [...this.models()];
    const modelYear = this.controller.modelYearFilterValue();
    if (modelYear !== 'all') models = models.filter(model => model.modelYear === modelYear);
    if (!this.controller.showInvalidValue()) models = models.filter(model => model.isValid);
    if (!this.controller.showFailedValidationValue()) models = models.filter(model => model.SEPValidationPass === true);
    const selected = this.models().find(model => model.modelId === this.group().selectedModelId);
    if (selected && (modelYear === 'all' || selected.modelYear === modelYear)
      && !models.some(model => model.modelId === selected.modelId)) models.unshift(selected);
    const field = this.sortField();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return models
      .sort((first, second) => compareNumbers(first[field], second[field]) * direction)
      .map(model => ({
        model,
        predictorSummary: model.predictorVariables.map(variable => variable.name).join(', '),
        equation: regressionEquation(model),
        criticalIssues: model.modelValidationNotes?.filter(note => !!note?.trim()) ?? [],
        validationIssues: model.dataValidationNotes?.filter(note => !!note?.trim()) ?? [],
        valid: !!model.isValid && !!model.SEPValidationPass
      }));
  });

  sort(field: ModelSort): void {
    if (this.sortField() === field) this.sortDirection.update(value => value === 'asc' ? 'desc' : 'asc');
    else { this.sortField.set(field); this.sortDirection.set('desc'); }
  }

  generateModels(): void { void this.workflow.generateModels(); }
}

function regressionEquation(model: JStatRegressionModel): string {
  const terms = model.predictorVariables.map((variable, index) => `(${formatNumber(model.coef[index + 1])} × ${variable.name})`);
  return [formatNumber(model.coef[0]), ...terms].join(' + ');
}

function formatNumber(value: number | undefined): string {
  return Number.isFinite(value) ? Number(value).toLocaleString(undefined, { maximumSignificantDigits: 6 }) : '—';
}

function compareNumbers(first: number | undefined, second: number | undefined): number {
  return (first ?? Number.NEGATIVE_INFINITY) - (second ?? Number.NEGATIVE_INFINITY);
}
