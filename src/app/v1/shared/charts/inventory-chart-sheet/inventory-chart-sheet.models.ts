import type { MeterResultsChartMetric, MeterResultsChartRow } from '../metric-results-chart.models';

export interface InventoryChartTrace extends MeterResultsChartMetric {
  readonly facilityGuid?: string;
  readonly facilityName?: string;
  readonly shortLabel?: string;
  readonly kind?: 'facility' | 'group' | 'meter' | 'predictor';
}

export interface InventoryChartView {
  readonly id: string;
  readonly title: string;
  readonly unit: string;
  readonly coverage: string;
  readonly metrics: readonly InventoryChartTrace[];
  readonly rows: readonly MeterResultsChartRow[];
}

export interface InventoryChartSheetView {
  readonly metric: string;
  readonly hiddenGuids: readonly string[];
  readonly tracePanelOpen?: boolean;
  readonly collapsedTraceFacilities?: readonly string[];
}
export const DEFAULT_INVENTORY_CHART_VIEW: InventoryChartSheetView = { metric: 'energy', hiddenGuids: [] };
