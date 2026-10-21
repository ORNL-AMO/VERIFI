import type { InventorySeriesStyle } from '@app/v1/shared/charts/inventory-chart-styles';

export interface VisualizationPredictor {
  readonly guid: string;
  readonly name: string;
  readonly unit: string;
  readonly label: string;
  readonly style: InventorySeriesStyle;
}

export interface GroupMonthlyPoint {
  readonly month: number;
  readonly label: string;
  readonly usage: number | null;
  readonly complete: boolean;
  readonly predictors: Readonly<Record<string, number | null>>;
  readonly duplicatePredictors: readonly string[];
}

export interface VisualizationRange {
  readonly start: string;
  readonly end: string;
}

export type TimeSeriesScale = 'raw' | 'z-score';

export interface GroupVisualizationPreferences {
  readonly scale: TimeSeriesScale;
  readonly visiblePredictors: readonly string[];
  readonly zoom: { readonly start: number; readonly end: number };
}

export interface TimeSeriesDisplay {
  readonly scale: TimeSeriesScale;
  readonly groupValues: readonly (number | null)[];
  readonly predictorValues: Readonly<Record<string, readonly (number | null)[]>>;
  readonly unavailableSeries: readonly string[];
}

export interface CorrelationSummary {
  readonly pairs: readonly { readonly x: number; readonly y: number; readonly label: string }[];
  readonly r?: number;
  readonly rSquared?: number;
  readonly slope?: number;
  readonly intercept?: number;
  readonly unavailableReason?: string;
}
