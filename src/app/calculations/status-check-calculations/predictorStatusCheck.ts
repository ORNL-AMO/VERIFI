
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
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

    constructor(predictor: IdbPredictor, predictorData: Array<IdbPredictorData>) {
        console.log('Running status check for predictor: ' + predictor.name);
        this.predictorId = predictor.guid;
        this.predictorName = predictor.name;
        this.missingEntryMonths = [];
        let predictorReadings: Array<IdbPredictorData> = predictorData.filter(data => data.predictorId === predictor.guid);
        this.checkEntries(predictorReadings);
        this.setStatus();
    }

    private checkEntries(predictorData: Array<IdbPredictorData>) {
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
}