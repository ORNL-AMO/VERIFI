/** Feature-neutral contracts consumed by reusable v1 metric result charts. */
export type MeterResultsPeriod = 'monthly' | 'yearly';

/** Temporary, semantic chart state. Never persisted as visualization intent. */
export interface MeterResultsChartPresentation {
  readonly leftMetricId?: string;
  readonly rightMetricId?: string;
  readonly leftDisplay: 'off' | 'bar' | 'line';
  readonly rightDisplay: 'off' | 'bar' | 'line';
  readonly leftTraceType: 'bar' | 'line';
  readonly rightTraceType: 'bar' | 'line';
  readonly hiddenMetricIds: readonly string[];
  readonly zoom: { readonly start: number; readonly end: number };
  readonly smoothLines: boolean;
  readonly legend: boolean;
}

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
  /** Feature-owned period and quality text, shared by tooltips and accessible values. */
  readonly annotations?: Readonly<Record<string, string>>;
  /** Metrics with no observation at this alignment slot; omit the slot rather than drawing a gap. */
  readonly paddingMetricIds?: readonly string[];
}
