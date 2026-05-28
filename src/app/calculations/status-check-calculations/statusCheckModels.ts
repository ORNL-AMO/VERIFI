export interface PredictorDateEntry {
    predictorName: string;
    predictorId: string;
    lastDateEntry: Date;
}

export interface MeterDateEntry {
    meterName: string;
    meterId: string;
    lastDateEntry: Date;
}

export type STATUS_CHECK_OPTIONS = 'good' | 'warning' | 'error' | 'outdated';

export interface StatusCheckAction {
    label: string;
    url: string;
    description: string;
    facilityId: string;
    type: 'account' | 'facility' | 'meter' | 'predictor';
    status: STATUS_CHECK_OPTIONS;
    isWeather?: boolean;
    trackGuid: string;
}

/**
 * Time-based data staleness threshold options in months.
 * Used to determine when meters/predictors are considered "outdated".
 */
export type DataStalenessMonths = 2 | 3 | 6 | 12;

/**
 * Default staleness threshold in months
 */
export const DEFAULT_DATA_STALENESS_MONTHS: DataStalenessMonths = 3;

/**
 * Available staleness threshold options
 */
export const DATA_STALENESS_OPTIONS: Array<{ value: DataStalenessMonths; label: string }> = [
    { value: 2, label: '2 months' },
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
    { value: 12, label: '12 months' }
];