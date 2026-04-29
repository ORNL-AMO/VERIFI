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