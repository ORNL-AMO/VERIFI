import { DataStalenessSettings } from '@data/models/idbModels/accountAndFacility';

export type DataStalenessMonths = DataStalenessSettings['thresholdMonths'];

export const DEFAULT_DATA_STALENESS_MONTHS: DataStalenessMonths = 3;

export const DATA_STALENESS_OPTIONS: ReadonlyArray<{ readonly value: DataStalenessMonths; readonly label: string }> = [
  { value: 2, label: '2 months' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' }
];
