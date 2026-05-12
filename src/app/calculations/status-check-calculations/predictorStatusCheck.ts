
import { formatDate } from "@angular/common";
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
    missingEntryMonths: Array<{ month: number, year: number }>;
    latestEntryDate: Date;
    actions: Array<StatusCheckAction>;

    constructor(predictor: IdbPredictor, predictorData: Array<IdbPredictorData>, outdatedDays: number = 60) {
        this.predictorId = predictor.guid;
        this.predictorName = predictor.name;
        this.missingEntryMonths = [];
        let predictorReadings: Array<IdbPredictorData> = predictorData.filter(data => data.predictorId === predictor.guid);
        this.checkEntries(predictorReadings);
        this.setStatus();
        this.setActions(predictor, predictorReadings, outdatedDays);
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
                    this.missingEntryMonths.push({ month, year });
                }
            }
        }
        this.hasMissingEntries = this.missingEntryMonths.length > 0;
    }

    private setStatus() {
        if (this.hasDuplicateEntries || this.hasMissingEntries) {
            this.status = 'error';
        } else {
            this.status = 'good';
        }
    }

    private setActions(predictor: IdbPredictor, predictorReadings: Array<IdbPredictorData>, outdatedDays: number) {
        this.actions = [];
        const baseUrl = `/data-management/${predictor.accountId}/facilities/${predictor.facilityId}/predictors/${predictor.guid}`;
        const isWeather = predictor.predictorType === 'Weather';
        if (predictorReadings.length === 0) {
            this.actions.push({
                label: 'Add predictor data for ' + predictor.name,
                url: baseUrl + '/predictor-data',
                description: 'Add predictor data for the predictor. This data is used to analyze and forecast resource usage based on various factors.',
                facilityId: predictor.facilityId,
                type: 'predictor',
                isWeather,
                trackGuid: predictor.guid
            });
        } else if (this.latestEntryDate) {
            // Set readingDate to end of the month
            const endOfMonth = new Date(this.latestEntryDate.getFullYear(), this.latestEntryDate.getMonth() + 1, 0);
            const outdatedMs = outdatedDays * 24 * 60 * 60 * 1000;
            if (endOfMonth.getTime() < (new Date().getTime() - outdatedMs)) {
                const formattedDate = formatDate(endOfMonth, 'MM/yyyy', 'en-US');
                this.actions.push({
                    label: 'Update predictor data for ' + predictor.name,
                    url: baseUrl + '/predictor-data',
                    description: `Update predictor data for the predictor. The latest reading (${formattedDate}) is more than ${outdatedDays} days old.`,
                    facilityId: predictor.facilityId,
                    type: 'predictor',
                    isWeather,
                    trackGuid: predictor.guid
                });
            }
        }
    }
}