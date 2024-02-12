import { IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import * as _ from 'lodash';
import { MonthlyAnalysisCalculatedValues } from "./monthlyAnalysisCalculatedValuesClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";
import { ConvertValue } from "../conversions/convertValue";

export class MonthlyFacilityAnalysisDataClass {

    date: Date;
    energyUse: number;
    modeledEnergy: number;
    baselineAdjustmentInput: number;
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
    facilityGUID: string;
    dataAdjustment: number;
    modelYearDataAdjustment: number;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>,
        monthDate: Date,
        facilityPredictorEntries: Array<IdbPredictorEntry>,
        previousMonthsSummaryData: Array<MonthlyFacilityAnalysisDataClass>,
        baselineYear: number,
        facility: IdbFacility) {
        this.facilityGUID = facility.guid;
        this.date = monthDate;
        this.setFiscalYear(facility);
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setMonthPredictorData(facilityPredictorEntries);
        this.setPredictorUsage(facilityPredictorEntries);
        this.setEnergyUse();
        this.setModeledEnergy();
        this.setBaselineAdjustmentInput();
        this.setDataAdjustment();
        this.setModelYearDataAdjustment();
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
        this.fiscalYear = getFiscalYear(new Date(this.date), facility);
    }

    setEnergyUse() {
        this.energyUse = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {return data.energyUse});
    }

    setModeledEnergy() {
        this.modeledEnergy = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {return data.modeledEnergy});
    }

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {return data.baselineAdjustmentInput});
    }

    setModelYearDataAdjustment() {
        this.modelYearDataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {return data.modelYearDataAdjustment});
    }

    setDataAdjustment() {
        this.dataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {return data.dataAdjustment});
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
            this.baselineAdjustmentInput,
            this.fiscalYear,
            baselineYear,
            previousMonthsAnalysisCalculatedValues,
            this.baselineActualEnergyUse,
            this.modelYearDataAdjustment,
            this.dataAdjustment
        );
    }

    convertResults(startingUnit: string, endingUnit: string) {
        this.energyUse = new ConvertValue(this.energyUse, startingUnit, endingUnit).convertedValue;
        this.modeledEnergy = new ConvertValue(this.modeledEnergy, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustmentInput = new ConvertValue(this.baselineAdjustmentInput, startingUnit, endingUnit).convertedValue;
        this.monthlyAnalysisCalculatedValues.convertResults(startingUnit, endingUnit);
    }
}