import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationObservation } from '@domain/visualizations/visualization-source-provider';

export interface TimeSeriesPoint {
  readonly slot: string;
  readonly start: string;
  readonly end: string;
  readonly observation: VisualizationObservation;
}
export interface TimeSeriesTrace {
  readonly id: string;
  readonly type: 'line' | 'bar';
  readonly label: string;
  readonly unit: string;
  readonly axis: 'left' | 'right';
  readonly color: string;
  readonly lineStyle: 'solid' | 'dashed' | 'dotted' | readonly number[];
  readonly role: 'primary' | 'comparison';
  readonly points: readonly TimeSeriesPoint[];
}
export interface TimeSeriesModel {
  readonly title: string;
  readonly chart: Extract<NonNullable<VisualizationDefinition['chart']>, { kind: 'time-series' }>;
  readonly legend: boolean;
  readonly slots: readonly { readonly key: string; readonly label: string; readonly order: number }[];
  readonly traces: readonly TimeSeriesTrace[];
  readonly warnings: readonly string[];
  readonly partial?: boolean;
}
