/** Feature-neutral contracts consumed by reusable v1 metric result charts. */
export type MeterResultsPeriod = 'monthly' | 'yearly';

export interface MeterResultsChartMetric {
  readonly id: string;
  readonly label: string;
  readonly unit?: string;
  readonly currency?: boolean;
  readonly color?: string;
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted' | readonly number[];
}

export interface MeterResultsChartComparisonBand {
  readonly referenceMetricId: string;
  readonly comparisonMetricId: string;
  readonly comparisonAboveColor: string;
  readonly referenceAboveColor: string;
}

export interface MeterResultsChartRow {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly sortValue: number;
  readonly values: Readonly<Record<string, number | null>>;
}
