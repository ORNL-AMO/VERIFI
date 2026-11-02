import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { calculateRegressionValidation } from '@domain/calculations/analysis-calculations/regression-validation-calculation';
import {
  RegressionValidationSource,
  RegressionValidationWorkerRequest,
  RegressionValidationWorkerResponse
} from '@platform/web-workers/regression-validation-worker.contract';
import { runWorker } from '@platform/web-workers/run-worker';
import { Observable, Subscription, defer, of } from 'rxjs';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';

export const REGRESSION_VALIDATION_DEBOUNCE_MS = 650;

export type RegressionModelValidationState =
  | { readonly state: 'idle'; readonly source?: RegressionValidationSource }
  | { readonly state: 'invalid'; readonly source: RegressionValidationSource; readonly message: string }
  | { readonly state: 'loading'; readonly source: RegressionValidationSource }
  | {
    readonly state: 'ready';
    readonly source: RegressionValidationSource;
    readonly model: JStatRegressionModel;
    readonly monthly: readonly MonthlyAnalysisSummaryData[];
    readonly comparison?: {
      readonly model: JStatRegressionModel;
      readonly monthly: readonly MonthlyAnalysisSummaryData[];
    };
  }
  | { readonly state: 'error'; readonly source: RegressionValidationSource; readonly message: string };

interface ValidationRequest {
  readonly source: RegressionValidationSource;
  readonly group: AnalysisGroup;
  readonly model?: JStatRegressionModel;
  readonly comparison?: {
    readonly group: AnalysisGroup;
    readonly model: JStatRegressionModel;
  };
}

@Injectable()
export class RegressionModelValidationService {
  private readonly context = inject(FacilityAnalysisGroupContext);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateValue = signal<RegressionModelValidationState>({ state: 'idle' });
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private activeCalculation: Subscription | undefined;
  private requestVersion = 0;
  private lastRequest: ValidationRequest | undefined;

  readonly state = this.stateValue.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelPendingCalculation());
  }

  scheduleUserDefined(group: AnalysisGroup): void {
    const request: ValidationRequest = { source: 'user-defined', group: structuredClone(group) };
    this.lastRequest = request;
    this.cancelPendingCalculation();
    const invalidMessage = userDefinedValidationMessage(group);
    if (invalidMessage) {
      this.stateValue.set({ state: 'invalid', source: 'user-defined', message: invalidMessage });
      return;
    }
    this.stateValue.set({ state: 'idle', source: 'user-defined' });
    this.debounceHandle = setTimeout(() => this.calculate(request), REGRESSION_VALIDATION_DEBOUNCE_MS);
  }

  inspectGenerated(group: AnalysisGroup, model: JStatRegressionModel, comparisonModel?: JStatRegressionModel): void {
    const request: ValidationRequest = {
      source: 'generated',
      group: groupWithGeneratedModel(group, model),
      model: structuredClone(model),
      comparison: comparisonModel && comparisonModel.modelId !== model.modelId
        ? { group: groupWithGeneratedModel(group, comparisonModel), model: structuredClone(comparisonModel) }
        : undefined
    };
    this.lastRequest = request;
    this.cancelPendingCalculation();
    this.calculate(request);
  }

  retry(): void {
    if (!this.lastRequest) return;
    this.cancelPendingCalculation();
    this.calculate(this.lastRequest);
  }

  clear(): void {
    this.lastRequest = undefined;
    this.cancelPendingCalculation();
    this.stateValue.set({ state: 'idle' });
  }

  private calculate(request: ValidationRequest): void {
    const workerRequest = this.buildWorkerRequest(request);
    if (!workerRequest) {
      this.stateValue.set({ state: 'error', source: request.source, message: 'Model validation is unavailable.' });
      return;
    }
    const version = ++this.requestVersion;
    this.stateValue.set({ state: 'loading', source: request.source });
    this.activeCalculation = runRegressionModelValidation(workerRequest).subscribe({
      next: response => {
        if (version !== this.requestVersion) return;
        if (response.ok === false) {
          this.stateValue.set({ state: 'error', source: request.source, message: response.message });
          return;
        }
        this.stateValue.set({ state: 'ready', source: request.source, ...response.value });
      },
      error: error => {
        if (version !== this.requestVersion) return;
        this.stateValue.set({
          state: 'error', source: request.source,
          message: error instanceof Error ? error.message : 'Model validation could not be calculated.'
        });
      }
    });
  }

  private buildWorkerRequest(request: ValidationRequest): RegressionValidationWorkerRequest | undefined {
    const analysis = this.context.autosave.draft();
    const facility = this.context.workbench.facility();
    const account = this.context.workbench.account();
    if (!analysis || !facility || !account) return undefined;
    return {
      source: request.source,
      group: structuredClone(request.group),
      model: request.model ? structuredClone(request.model) : undefined,
      comparison: request.comparison ? structuredClone(request.comparison) : undefined,
      analysisItem: structuredClone(analysis),
      facility: structuredClone(facility),
      meters: [...this.context.workbench.workspace.facilityMeters()],
      meterData: [...this.context.workbench.workspace.facilityMeterData()],
      facilityPredictorData: [...this.context.workbench.workspace.facilityPredictorData()],
      accountPredictorEntries: [...this.context.workbench.workspace.predictorData()],
      accountAnalysisItems: [...this.context.workbench.workspace.facilityAnalyses()],
      assessmentReportVersion: account.assessmentReportVersion ?? 'AR6'
    };
  }

  private cancelPendingCalculation(): void {
    if (this.debounceHandle !== undefined) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = undefined;
    }
    this.requestVersion += 1;
    this.activeCalculation?.unsubscribe();
    this.activeCalculation = undefined;
  }
}

export function runRegressionModelValidation(
  request: RegressionValidationWorkerRequest
): Observable<RegressionValidationWorkerResponse> {
  return typeof Worker !== 'undefined'
    ? runWorker<RegressionValidationWorkerResponse>(
      new Worker(new URL('../../../../../../platform/web-workers/regression-validation.worker', import.meta.url)),
      request
    )
    : defer(() => of({ ok: true as const, value: calculateRegressionValidation(request) }));
}

export function userDefinedValidationMessage(group: AnalysisGroup): string | undefined {
  if (!group.predictorVariables.some(variable => variable.productionInAnalysis)) return 'Select at least one predictor.';
  if (!Number.isFinite(group.regressionConstant)) return 'Enter the regression constant.';
  if (group.predictorVariables.some(variable => variable.productionInAnalysis && !Number.isFinite(variable.regressionCoefficient))) {
    return 'Enter a coefficient for every selected predictor.';
  }
  if ([group.regressionModelStartMonth, group.regressionStartYear, group.regressionModelEndMonth, group.regressionEndYear]
    .some(value => !Number.isFinite(value))) return 'Select the complete model period.';
  const months = modelPeriodMonthCount(group);
  if (months <= 0) return 'The model end date must be after the start date.';
  if (months < 12) return 'Select at least 12 complete months.';
  return undefined;
}

export function modelPeriodMonthCount(group: AnalysisGroup): number {
  if (![group.regressionModelStartMonth, group.regressionStartYear, group.regressionModelEndMonth, group.regressionEndYear]
    .every(value => Number.isFinite(value))) return 0;
  return (group.regressionEndYear - group.regressionStartYear) * 12
    + group.regressionModelEndMonth - group.regressionModelStartMonth + 1;
}

export function validationAnalysisCopies(
  analysis: IdbAnalysisItem,
  source: RegressionValidationSource,
  group: AnalysisGroup
): { chartAnalysis: IdbAnalysisItem; modelAnalysis: IdbAnalysisItem } {
  const chartAnalysis = structuredClone(analysis);
  const modelAnalysis = structuredClone(analysis);
  if (source === 'user-defined') modelAnalysis.baselineYear = group.regressionStartYear;
  return { chartAnalysis, modelAnalysis };
}

export function groupWithGeneratedModel(group: AnalysisGroup, model: JStatRegressionModel): AnalysisGroup {
  const clone = structuredClone(group);
  clone.regressionConstant = model.coef[0];
  clone.regressionModelYear = model.modelYear;
  clone.selectedModelId = model.modelId;
  clone.models = [structuredClone(model)];
  clone.predictorVariables = clone.predictorVariables.map(variable => {
    const index = model.predictorVariables.findIndex(item => item.id === variable.id);
    return {
      ...variable,
      productionInAnalysis: index >= 0,
      regressionCoefficient: index >= 0 ? model.coef[index + 1] : undefined
    };
  });
  return clone;
}
