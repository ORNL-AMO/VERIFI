import { Injectable, signal } from '@angular/core';
import { AnalysisTableColumns } from '@data/models/analysis';
import { LocalStorageService } from 'ngx-webstorage';

export type AnalysisResultDisplay = 'table' | 'graph';
export const ANALYSIS_TABLE_COLUMNS_STORAGE_KEY = 'v1AnalysisTableColumns';

export const DEFAULT_ANALYSIS_TABLE_COLUMNS: AnalysisTableColumns = {
  incrementalImprovement: false,
  SEnPI: true,
  savings: true,
  percentSavingsComparedToBaseline: false,
  yearToDateSavings: true,
  yearToDatePercentSavings: false,
  rollingSavings: true,
  rolling12MonthImprovement: true,
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
  bankedSavings: true,
  savingsUnbanked: true
};

@Injectable()
export class FacilityAnalysisResultsDisplayService {
  private readonly columnsValue = signal<AnalysisTableColumns>(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS));
  private readonly displayByKey = signal<Record<string, AnalysisResultDisplay>>({});
  readonly columns = this.columnsValue.asReadonly();

  constructor(private readonly localStorage: LocalStorageService) {
    const stored = localStorage.retrieve(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY) as Partial<AnalysisTableColumns> | undefined;
    if (stored) this.columnsValue.set({ ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), ...stored });
  }

  display(key: string): AnalysisResultDisplay { return this.displayByKey()[key] ?? 'table'; }

  setDisplay(key: string, display: AnalysisResultDisplay): void {
    this.displayByKey.update(current => ({ ...current, [key]: display }));
  }

  setColumn(column: keyof AnalysisTableColumns, visible: boolean): void {
    const value = this.columnsValue()[column];
    if (typeof value !== 'boolean') return;
    const updated = { ...this.columnsValue(), [column]: visible };
    this.columnsValue.set(updated);
    this.localStorage.store(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, updated);
  }
}
