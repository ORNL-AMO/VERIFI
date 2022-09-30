import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import * as _ from 'lodash';

export class MonthlyFacilityAnalysisDataClass {

    date: Date;
    energyUse: number;
    modeledEnergy: number;
    adjustedForNormalization: number;
    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustmentForOther: number;
    baselineAdjustment: number;
    predictorUsage: Array<{
        usage: number;
        predictorId: string
    }>;
    fiscalYear: number;
    SEnPI: number;
    savings: number;
    percentSavingsComparedToBaseline: number;
    yearToDateSavings: number;
    yearToDatePercentSavings: number;
    rollingSavings: number;
    rolling12MonthImprovement: number;

    currentMonthData: Array<MonthlyAnalysisSummaryData>;
    monthPredictorData: Array<IdbPredictorEntry>;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>, 
        monthDate: Date, 
        facilityPredictorEntries: Array<IdbPredictorEntry>) {
        this.date = monthDate;
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setMonthPredictorData(facilityPredictorEntries);
        this.setPredictorUsage(facilityPredictorEntries);
    }

    setCurrentMonthData(allFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>) {
        this.currentMonthData = allFacilityAnalysisData.filter(summaryData => {
            let summaryDataDate: Date = new Date(summaryData.date);
            return summaryDataDate.getUTCMonth() == this.date.getUTCMonth() && summaryDataDate.getUTCFullYear() == this.date.getUTCFullYear();
        });
    }

    setEnergyUse(){
        this.energyUse = _.sumBy(this.currentMonthData, 'energyUse');
    }

    setModeledEnergy(){
        this.modeledEnergy = _.sumBy(this.currentMonthData, 'modeledEnergy');
    }

    setMonthPredictorData(facilityPredictorEntries: Array<IdbPredictorEntry>) {
        this.monthPredictorData = facilityPredictorEntries.filter(predictorData => {
            let predictorDate: Date = new Date(predictorData.date);
            return predictorDate.getUTCFullYear() == this.date.getUTCFullYear() && predictorDate.getUTCMonth() == this.date.getUTCMonth();
        });
    }

    setPredictorUsage(facilityPredictorEntries: Array<IdbPredictorEntry>) {
        this.predictorUsage = new Array();
        if (facilityPredictorEntries.length != 0) {
            let predictorVariables: Array<PredictorData> = facilityPredictorEntries[0].predictors;
            predictorVariables.forEach(variable => {
                let usageVal: number = 0;
                this.monthPredictorData.forEach(data => {
                    let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
                    usageVal = usageVal + predictorData.amount;
                });
                this.predictorUsage.push({
                    usage: usageVal,
                    predictorId: variable.id
                });
            });
        }
    }

}