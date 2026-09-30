import { ColumnTarget } from '@data/import/spreadsheet-import.models';

export interface ImportColumnCardView {
  readonly id: string;
  readonly header: string;
  readonly index: number;
  readonly target: ColumnTarget;
  readonly likelyDate: boolean;
}

export interface ImportColumnLaneView {
  readonly target: ColumnTarget;
  readonly label: string;
  readonly description: string;
  readonly icon: 'viewHidden' | 'calendar' | 'meter' | 'predictor';
  readonly cards: readonly ImportColumnCardView[];
  readonly totalCount: number;
}

export interface ImportColumnDateStatus {
  readonly selected: boolean;
  readonly usable: boolean;
  readonly usableCount: number;
  readonly invalidCount: number;
  readonly invalidRows: readonly number[];
  readonly range: string;
}

export interface ImportColumnStepStatus {
  readonly ready: boolean;
  readonly hasDataColumn: boolean;
  readonly date: ImportColumnDateStatus;
}

export const IMPORT_COLUMN_TARGETS: readonly ColumnTarget[] = [
  'Worksheet Columns',
  'Date',
  'Meters',
  'Predictors'
];

export function columnTargetLabel(target: ColumnTarget): string {
  return target === 'Worksheet Columns' ? 'Not imported' : target;
}
