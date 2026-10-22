import type { MeterResultsChartMetric, MeterResultsChartRow } from '../metric-results-chart.models';

export interface InventoryChartView {
  readonly id: string;
  readonly title: string;
  readonly unit: string;
  readonly coverage: string;
  readonly metrics: readonly MeterResultsChartMetric[];
  readonly rows: readonly MeterResultsChartRow[];
}

export interface InventoryChartSheetView {
  readonly metric: string;
  readonly hiddenGuids: readonly string[];
  readonly legendPage: number;
}
export const DEFAULT_INVENTORY_CHART_VIEW: InventoryChartSheetView = { metric: 'energy', hiddenGuids: [], legendPage: 0 };
