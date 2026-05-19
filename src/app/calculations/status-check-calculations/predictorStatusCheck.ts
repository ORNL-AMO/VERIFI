
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import * as _ from 'lodash';

export class PredictorStatusCheck {
    status: STATUS_CHECK_OPTIONS;
    predictorId: string;
    predictorName: string;
    hasDuplicateEntries: boolean;
    hasMissingEntries: boolean;
    hasWeatherDataWarning: boolean;
    missingEntryMonths: Array<{ month: number, year: number, date: Date }>;
    duplicateEntryMonths: Array<{ month: number, year: number, date: Date }>;
    latestEntryDate: Date;
    hasNoData: boolean;
    isDataCurrent: boolean;
    actions: Array<StatusCheckAction>;
    latestFacilityEntryDate: Date | undefined;

    constructor(
        predictor: IdbPredictor,
        predictorData: Array<IdbPredictorData>,
        facilityLatestEntry: { month: number; year: number } | undefined
    ) {
        this.predictorId = predictor.guid;
        this.predictorName = predictor.name;
        if (facilityLatestEntry) {
            this.latestFacilityEntryDate = new Date(facilityLatestEntry.year, facilityLatestEntry.month - 1, 1);
        }
        this.missingEntryMonths = [];
        const predictorReadings: Array<IdbPredictorData> = predictorData.filter(data => data.predictorId === predictor.guid);
        this.hasNoData = predictorReadings.length === 0;
        this.checkEntries(predictorReadings);
        this.isDataCurrent = this.computeIsDataCurrent(facilityLatestEntry);
        this.setHasWeatherDataWarning(predictor, predictorReadings);
        this.setStatus();
        this.setActions(predictor, facilityLatestEntry);
    }

    private checkEntries(predictorData: Array<IdbPredictorData>) {
        if (predictorData.length === 0) {
            this.hasDuplicateEntries = false;
            this.hasMissingEntries = false;
            this.latestEntryDate = undefined;
            return;
        }
        let monthYearCounts: {
            [key: string]: number;
        } = {};
        predictorData.forEach((data: IdbPredictorData): void => {
            let key: string = `${data.month}-${data.year}`;
            if (monthYearCounts[key]) {
                monthYearCounts[key] += 1;
            } else {
                monthYearCounts[key] = 1;
            }
        });
        this.hasDuplicateEntries = _.some(monthYearCounts, (count: number): boolean => count > 1);
        this.duplicateEntryMonths = [];
        for (let key in monthYearCounts) {
            if (monthYearCounts[key] > 1) {
                let [month, year] = key.split('-').map(num => parseInt(num));
                this.duplicateEntryMonths.push({ month, year, date: new Date(year, month - 1, 1) });
            }
        }

        //check for missing months between first and last entry
        let firstEntry = _.minBy(predictorData, (data: IdbPredictorData) => new Date(data.year, data.month - 1));
        let lastEntry = _.maxBy(predictorData, (data: IdbPredictorData) => new Date(data.year, data.month - 1));
        this.latestEntryDate = new Date(lastEntry.year, lastEntry.month - 1);
        let monthYearSet: Set<string> = new Set(Object.keys(monthYearCounts));
        this.missingEntryMonths = [];
        for (let year = firstEntry.year; year <= lastEntry.year; year++) {
            let startMonth = year === firstEntry.year ? firstEntry.month : 1;
            let endMonth = year === lastEntry.year ? lastEntry.month : 12;
            for (let month = startMonth; month <= endMonth; month++) {
                let key: string = `${month}-${year}`;
                if (!monthYearSet.has(key)) {
                    this.missingEntryMonths.push({ month, year, date: new Date(year, month - 1, 1) });
                }
            }
        }
        this.hasMissingEntries = this.missingEntryMonths.length > 0;
    }

    private computeIsDataCurrent(facilityLatestEntry: { month: number; year: number } | undefined): boolean {
        if (this.hasNoData || !facilityLatestEntry || !this.latestEntryDate) return false;
        const entryYear = this.latestEntryDate.getFullYear();
        const entryMonth = this.latestEntryDate.getMonth() + 1;
        return entryYear > facilityLatestEntry.year ||
            (entryYear === facilityLatestEntry.year && entryMonth >= facilityLatestEntry.month);
    }

    private setStatus() {
        if (this.hasNoData || this.hasDuplicateEntries || this.hasMissingEntries) {
            this.status = 'error';
        } else if (!this.isDataCurrent || this.hasWeatherDataWarning) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }

    private setActions(predictor: IdbPredictor, facilityLatestEntry: { month: number; year: number } | undefined) {
        this.actions = [];
        const baseUrl = `/data-management/${predictor.accountId}/facilities/${predictor.facilityId}/predictors/${predictor.guid}`;
        const isWeather = predictor.predictorType === 'Weather';
        if (this.hasNoData) {
            this.actions.push({
                label: 'Add predictor data for ' + predictor.name,
                url: baseUrl + '/predictor-data',
                description: 'No data has been entered for this predictor.',
                facilityId: predictor.facilityId,
                type: 'predictor',
                status: 'error',
                isWeather,
                trackGuid: predictor.guid + '_add'
            });
        } else if (!this.isDataCurrent && facilityLatestEntry && this.latestEntryDate) {
            const latestLabel = this.monthLabel(facilityLatestEntry.month, facilityLatestEntry.year);
            const dataLabel = this.monthLabel(this.latestEntryDate.getMonth() + 1, this.latestEntryDate.getFullYear());
            this.actions.push({
                label: 'Update predictor data for ' + predictor.name,
                url: baseUrl + '/predictor-data',
                description: `Facility data runs through ${latestLabel} but this predictor has data through ${dataLabel}.`,
                facilityId: predictor.facilityId,
                type: 'predictor',
                status: 'warning',
                isWeather,
                trackGuid: predictor.guid + '_update'
            });
        } else if(this.hasMissingEntries){
            this.actions.push({
                label: 'Add missing predictor data for ' + predictor.name,
                url: baseUrl + '/predictor-data',
                description: `This predictor has missing data for ${this.missingEntryMonths.length} month(s).`,
                facilityId: predictor.facilityId,
                type: 'predictor',
                status: 'error',
                isWeather,
                trackGuid: predictor.guid + '_add_missing'
            });
        } else if(this.hasDuplicateEntries){
            this.actions.push({
                label: 'Resolve duplicate predictor data for ' + predictor.name,
                url: baseUrl + '/predictor-data',
                description: `This predictor has duplicate entries for ${this.duplicateEntryMonths.length} month(s).`,
                facilityId: predictor.facilityId,
                type: 'predictor',
                status: 'error',
                isWeather,
                trackGuid: predictor.guid + '_resolve_duplicates'
            });
        } else if (this.hasWeatherDataWarning) {
            this.actions.push({
                label: 'Review weather data warnings for ' + predictor.name,
                url: baseUrl + '/predictor-data',
                description: `Some data entries for this weather predictor have been flagged with warnings. Review the data to ensure accuracy.`,
                facilityId: predictor.facilityId,
                type: 'predictor',
                status: 'warning',
                isWeather,
                trackGuid: predictor.guid + '_weather_warnings'
            });
        }
    }

    private monthLabel(month: number, year: number): string {
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    private setHasWeatherDataWarning(predictor: IdbPredictor, predictorData: Array<IdbPredictorData>) {
        if (predictor.predictorType !== 'Weather') {
            this.hasWeatherDataWarning = false;
            return;
        }
        this.hasWeatherDataWarning = predictorData.some(data => data.weatherDataWarning);
    }
}