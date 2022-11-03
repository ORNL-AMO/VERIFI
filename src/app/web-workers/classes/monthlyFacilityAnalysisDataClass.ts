import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import * as _ from 'lodash';
import { MonthlyAnalysisCalculatedValues } from "./monthlyAnalysisCalculatedValuesClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { HelperService } from "./helperService";

export class MonthlyFacilityAnalysisDataClass {

    date: Date;
    energyUse: number;
    modeledEnergy: number;
    baselineAdjustmentForOther: number;
    predictorUsage: Array<{
        usage: number,
        predictorId: string
    }>;
    fiscalYear: number;
    monthlyAnalysisCalculatedValues: MonthlyAnalysisCalculatedValues;

    currentMonthData: Array<MonthlyAnalysisSummaryDataClass>;
    monthPredictorData: Array<IdbPredictorEntry>;
    baselineActualEnergyUse: number;
    monthIndex: number;
    helperService: HelperService;
    facilityGUID: string;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>,
        monthDate: Date,
        facilityPredictorEntries: Array<IdbPredictorEntry>,
        previousMonthsSummaryData: Array<MonthlyFacilityAnalysisDataClass>,
        baselineYear: number,
        facility: IdbFacility) {
        this.facilityGUID = facility.guid;
        this.helperService = new HelperService();
        this.date = monthDate;
        this.setFiscalYear(facility);
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setMonthPredictorData(facilityPredictorEntries);
        this.setPredictorUsage(facilityPredictorEntries);
        this.setEnergyUse();
        this.setModeledEnergy();
        this.setBaselineAdjustmentForOther();
        this.setMonthIndex(previousMonthsSummaryData);
        this.setBaselineActualEnergyUse(baselineYear, previousMonthsSummaryData);
        this.setMonthlyAnalysisCalculatedValues(baselineYear, previousMonthsSummaryData);
    }

    setCurrentMonthData(allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.currentMonthData = allFacilityAnalysisData.filter(summaryData => {
            let summaryDataDate: Date = new Date(summaryData.date);
            return summaryDataDate.getUTCMonth() == this.date.getUTCMonth() && summaryDataDate.getUTCFullYear() == this.date.getUTCFullYear();
        });
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

    setFiscalYear(facility: IdbFacility) {
        this.fiscalYear = this.helperService.getFiscalYear(new Date(this.date), facility);
    }

    setEnergyUse() {
        this.energyUse = _.sumBy(this.currentMonthData, 'energyUse');
    }

    setModeledEnergy() {
        this.modeledEnergy = _.sumBy(this.currentMonthData, 'modeledEnergy');
    }

    setBaselineAdjustmentForOther() {
        this.baselineAdjustmentForOther = _.sumBy(this.currentMonthData, 'baselineAdjustmentForOther');
    }

    setMonthIndex(previousMonthsSummaryData: Array<MonthlyFacilityAnalysisDataClass>) {
        let summaryDataIndex: number = previousMonthsSummaryData.length;
        if (summaryDataIndex == 0) {
            this.monthIndex = 0;
        } else {
            let previousMonthSummaryData: MonthlyFacilityAnalysisDataClass = previousMonthsSummaryData[summaryDataIndex - 1];
            if (previousMonthSummaryData.fiscalYear == this.fiscalYear) {
                this.monthIndex = previousMonthSummaryData.monthIndex + 1;
            } else {
                this.monthIndex = 0;
            }
        }
    }

    setBaselineActualEnergyUse(baselineYear: number, previousMonthsSummaryData: Array<MonthlyFacilityAnalysisDataClass>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineActualEnergyUse = this.energyUse;
        } else {
            this.baselineActualEnergyUse = previousMonthsSummaryData[this.monthIndex].energyUse;
        }
    }
    setMonthlyAnalysisCalculatedValues(baselineYear: number, previousMonthsSummaryData: Array<MonthlyFacilityAnalysisDataClass>) {
        let previousMonthsAnalysisCalculatedValues: Array<MonthlyAnalysisCalculatedValues> = previousMonthsSummaryData.map(data => { return data.monthlyAnalysisCalculatedValues });
        this.monthlyAnalysisCalculatedValues = new MonthlyAnalysisCalculatedValues(
            this.energyUse,
            this.modeledEnergy,
            this.baselineAdjustmentForOther,
            this.fiscalYear,
            baselineYear,
            previousMonthsAnalysisCalculatedValues,
            this.baselineActualEnergyUse
        );
    }

}