import { Injectable, signal } from '@angular/core';
import { AnalysisGroupPredictorVariable, AnalysisTableColumns } from '@data/models/analysis';
import { LocalStorageService } from 'ngx-webstorage';

export const ANALYSIS_TABLE_COLUMNS_STORAGE_KEY = 'v1AnalysisTableColumns';
export type AnalysisResultTablePeriod = 'annual' | 'monthly';

interface StoredAnalysisTableColumns {
  readonly annual: Partial<AnalysisTableColumns>;
  readonly monthly: Partial<AnalysisTableColumns>;
}

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
  private readonly annualColumnsValue = signal<AnalysisTableColumns>(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS));
  private readonly monthlyColumnsValue = signal<AnalysisTableColumns>(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS));
  readonly annualColumns = this.annualColumnsValue.asReadonly();
  readonly monthlyColumns = this.monthlyColumnsValue.asReadonly();

  constructor(private readonly localStorage: LocalStorageService) {
    const stored = localStorage.retrieve(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY) as Partial<AnalysisTableColumns> | StoredAnalysisTableColumns | undefined;
    if (!stored) return;
    if (isPeriodScopedColumns(stored)) {
      this.annualColumnsValue.set({ ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), ...stored.annual, productionVariables: true });
      this.monthlyColumnsValue.set({ ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), ...stored.monthly, productionVariables: true });
    } else {
      const migrated = { ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), ...stored, productionVariables: true };
      this.annualColumnsValue.set(structuredClone(migrated));
      this.monthlyColumnsValue.set(structuredClone(migrated));
    }
  }

  columns(period: AnalysisResultTablePeriod): AnalysisTableColumns {
    return this.columnsValue(period)();
  }

  setColumn(period: AnalysisResultTablePeriod, column: keyof AnalysisTableColumns, visible: boolean): void {
    if (column === 'productionVariables') return;
    const value = this.columns(period)[column];
    if (typeof value !== 'boolean') return;
    this.setColumnsValue(period, { ...this.columns(period), [column]: visible });
    this.persist();
  }

  setColumns(period: AnalysisResultTablePeriod, columns: Readonly<Partial<AnalysisTableColumns>>): void {
    const updated = { ...this.columns(period) };
    for (const [column, visible] of Object.entries(columns)) {
      const columnId = column as keyof AnalysisTableColumns;
      if (columnId !== 'productionVariables' && typeof updated[columnId] === 'boolean' && typeof visible === 'boolean') {
        Object.assign(updated, { [columnId]: visible });
      }
    }
    this.setColumnsValue(period, updated);
    this.persist();
  }

  syncPredictors(period: AnalysisResultTablePeriod, scopeId: string, predictors: readonly AnalysisGroupPredictorVariable[]): void {
    const current = this.columns(period);
    const existing = current.predictorGroupId === scopeId
      ? new Map(current.predictors.map(item => [item.predictor.id, item]))
      : new Map();
    const selections = predictors.map(predictor => {
      const previous = existing.get(predictor.id);
      return {
        predictor: { ...predictor },
        display: previous?.display ?? predictor.productionInAnalysis,
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
    this.setColumnsValue(period, updated);
    this.persist();
  }

  setPredictorVisibility(period: AnalysisResultTablePeriod, scopeId: string, visibility: Readonly<Record<string, boolean>>): void {
    const current = this.columns(period);
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
    this.setColumnsValue(period, updated);
    this.persist();
  }

  private columnsValue(period: AnalysisResultTablePeriod) {
    return period === 'annual' ? this.annualColumnsValue : this.monthlyColumnsValue;
  }

  private setColumnsValue(period: AnalysisResultTablePeriod, value: AnalysisTableColumns): void {
    this.columnsValue(period).set(value);
  }

  private persist(): void {
    this.localStorage.store(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, {
      annual: this.annualColumns(),
      monthly: this.monthlyColumns()
    } satisfies StoredAnalysisTableColumns);
  }
}

function isPeriodScopedColumns(value: Partial<AnalysisTableColumns> | StoredAnalysisTableColumns): value is StoredAnalysisTableColumns {
  return 'annual' in value && 'monthly' in value;
}
