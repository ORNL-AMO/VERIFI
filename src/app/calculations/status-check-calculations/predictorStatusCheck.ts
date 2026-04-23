
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
    latestEntryDate: Date;
    // isPredictorValid: boolean;

    constructor(predictor: IdbPredictor, predictorData: Array<IdbPredictorData>) {
        //TODO: flesh out predictor status check logic and messages
        this.predictorId = predictor.guid;
        this.predictorName = predictor.name;
        let predictorReadings: Array<IdbPredictorData> = predictorData.filter(data => data.predictorId === predictor.guid);
        // this.isPredictorValid = isPredictorInvalid(predictor);
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
        let hasMissing = false;
        for (let year = firstEntry.year; year <= lastEntry.year; year++) {
            for (let month = 1; month <= 12; month++) {
                let key: string = `${month}-${year}`;
                if (!monthYearSet.has(key)) {
                    hasMissing = true;
                    break;
                }
            }
            if (hasMissing) {
                break;
            }
        }
        this.hasMissingEntries = hasMissing;
    }

    private setStatus() {
        if (this.hasDuplicateEntries) {
            this.status = 'error';
        } else if (this.hasMissingEntries) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }
}