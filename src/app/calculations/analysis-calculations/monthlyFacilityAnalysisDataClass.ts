import { IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import * as _ from 'lodash';
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";
import { ConvertValue } from "../conversions/convertValue";
import { MonthlyAnalysisCalculatedValuesSummation } from "./monthlyAnalysisCalculatedValuesClassSummation";

export class MonthlyFacilityAnalysisDataClass {

    date: Date;
    baselineAdjustmentInput: number;
    predictorUsage: Array<{
        usage: number,
        predictorId: string
    }>;
    fiscalYear: number;
    monthlyAnalysisCalculatedValues: MonthlyAnalysisCalculatedValuesSummation;

    currentMonthData: Array<MonthlyAnalysisSummaryDataClass>;
    monthPredictorData: Array<IdbPredictorEntry>;
    baselineActualEnergyUse: number;
    facilityGUID: string;
    dataAdjustment: number;
    modelYearDataAdjustment: number;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>,
        monthDate: Date,
        facilityPredictorEntries: Array<IdbPredictorEntry>,
        facility: IdbFacility) {
        this.facilityGUID = facility.guid;
        this.date = monthDate;
        this.setFiscalYear(facility);
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setMonthPredictorData(facilityPredictorEntries);
        this.setPredictorUsage(facilityPredictorEntries);
        this.setBaselineAdjustmentInput();
        this.setDataAdjustment();
        this.setModelYearDataAdjustment();
        this.setMonthlyAnalysisCalculatedValues();
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
        this.fiscalYear = getFiscalYear(new Date(this.date), facility);
    }

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.baselineAdjustmentInput });
    }

    setModelYearDataAdjustment() {
        this.modelYearDataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.modelYearDataAdjustment });
    }

    setDataAdjustment() {
        this.dataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.dataAdjustment });
    }

    setMonthlyAnalysisCalculatedValues() {
        this.monthlyAnalysisCalculatedValues = new MonthlyAnalysisCalculatedValuesSummation(this.currentMonthData);
    }

    convertResults(startingUnit: string, endingUnit: string) {
        this.baselineAdjustmentInput = new ConvertValue(this.baselineAdjustmentInput, startingUnit, endingUnit).convertedValue;
        this.monthlyAnalysisCalculatedValues.convertResults(startingUnit, endingUnit);
    }
}