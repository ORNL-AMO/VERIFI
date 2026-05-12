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

export type STATUS_CHECK_OPTIONS = 'good' | 'warning' | 'error';

export interface StatusCheckAction {
    label: string;
    url: string;
    description: string;
    facilityId: string;
    type: 'account' | 'facility' | 'meter' | 'predictor';
    isWeather?: boolean;
    trackGuid: string;
}