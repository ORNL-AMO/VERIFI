import { Injectable, signal } from '@angular/core';
import { AnalysisGroupPredictorVariable, AnalysisTableColumns } from '@data/models/analysis';
import { LocalStorageService } from 'ngx-webstorage';

export const ANALYSIS_TABLE_COLUMNS_STORAGE_KEY = 'v1AnalysisTableColumns';

export const DEFAULT_ANALYSIS_TABLE_COLUMNS: AnalysisTableColumns = {
  incrementalImprovement: false,
  SEnPI: false,
  savings: false,
  percentSavingsComparedToBaseline: false,
  yearToDateSavings: false,
  yearToDatePercentSavings: false,
  rollingSavings: false,
  rolling12MonthImprovement: false,
  productionVariables: true,
  energy: true,
  actualEnergy: true,
  modeledEnergy: true,
  adjusted: true,
  baselineAdjustmentForNormalization: true,
  baselineAdjustmentForOther: true,
  baselineAdjustment: true,
  totalSavingsPercentImprovement: true,
  annualSavingsPercentImprovement: true,
  cummulativeSavings: true,
  newSavings: true,
  predictors: [],
  predictorGroupId: undefined,
  bankedSavings: false,
  savingsUnbanked: false
};

@Injectable()
export class FacilityAnalysisResultsDisplayService {
  private readonly columnsValue = signal<AnalysisTableColumns>(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS));
  readonly columns = this.columnsValue.asReadonly();

  constructor(private readonly localStorage: LocalStorageService) {
    const stored = localStorage.retrieve(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY) as Partial<AnalysisTableColumns> | undefined;
    if (stored) this.columnsValue.set({ ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), ...stored });
  }

  setColumn(column: keyof AnalysisTableColumns, visible: boolean): void {
    const value = this.columnsValue()[column];
    if (typeof value !== 'boolean') return;
    const updated = { ...this.columnsValue(), [column]: visible };
    this.columnsValue.set(updated);
    this.localStorage.store(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, updated);
  }

  setColumns(columns: Readonly<Partial<AnalysisTableColumns>>): void {
    const updated = { ...this.columnsValue() };
    for (const [column, visible] of Object.entries(columns)) {
      const columnId = column as keyof AnalysisTableColumns;
      if (typeof updated[columnId] === 'boolean' && typeof visible === 'boolean') {
        Object.assign(updated, { [columnId]: visible });
      }
    }
    this.columnsValue.set(updated);
    this.localStorage.store(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, updated);
  }

  syncPredictors(scopeId: string, predictors: readonly AnalysisGroupPredictorVariable[]): void {
    const current = this.columnsValue();
    const existing = current.predictorGroupId === scopeId
      ? new Map(current.predictors.map(item => [item.predictor.id, item]))
      : new Map();
    const selections = predictors.map(predictor => {
      const previous = existing.get(predictor.id);
      return {
        predictor: { ...predictor },
        display: previous?.display ?? (predictor.productionInAnalysis && current.productionVariables),
        usedInAnalysis: predictor.productionInAnalysis
      };
    });
    const unchanged = current.predictorGroupId === scopeId
      && current.predictors.length === selections.length
      && selections.every((selection, index) => {
        const previous = current.predictors[index];
        return previous?.predictor.id === selection.predictor.id
          && previous.display === selection.display
          && previous.usedInAnalysis === selection.usedInAnalysis
          && previous.predictor.name === selection.predictor.name
          && previous.predictor.unit === selection.predictor.unit;
      });
    if (unchanged) {
      return;
    }
    const updated = { ...current, predictors: selections, predictorGroupId: scopeId };
    this.columnsValue.set(updated);
    this.localStorage.store(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, updated);
  }

  setPredictorVisibility(scopeId: string, visibility: Readonly<Record<string, boolean>>): void {
    const current = this.columnsValue();
    if (current.predictorGroupId !== scopeId) {
      return;
    }
    const updated = {
      ...current,
      predictors: current.predictors.map(item => ({
        ...item,
        display: visibility[item.predictor.id] ?? item.display
      }))
    };
    this.columnsValue.set(updated);
    this.localStorage.store(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, updated);
  }
}
