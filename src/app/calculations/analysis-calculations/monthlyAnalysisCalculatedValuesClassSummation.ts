import * as _ from 'lodash';
import { ConvertValue } from '../conversions/convertValue';
import { MonthlyAnalysisSummaryDataClass } from './monthlyAnalysisSummaryDataClass';

export class MonthlyAnalysisCalculatedValuesSummation {
    //results
    energyUse: number;
    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustment: number;
    fiscalYear: number;
    SEnPI: number;
    savings: number;
    percentSavingsComparedToBaseline: number;
    yearToDateSavings: number;
    yearToDatePercentSavings: number;
    rollingSavings: number;
    rolling12MonthImprovement: number;

    //used for calcs
    yearToDateBaselineActualEnergyUse: number;
    yearToDateActualEnergyUse: number;
    yearToDateAdjustedEnergyUse: number;
    summaryDataIndex: number;
    monthIndex: number;
    baselineAdjustmentForOtherV2: number;
    constructor(
        currentMonthData: Array<MonthlyAnalysisSummaryDataClass>,
        baselineAdjustmentForNew: number,
        previousMonthsValues: Array<MonthlyAnalysisCalculatedValuesSummation>,
        baselineYear: number,
        fiscalYear: number
    ) {
        this.fiscalYear = fiscalYear;
        this.initializeYearToDateValues(previousMonthsValues);
        this.setEnergyUse(currentMonthData);
        this.setYearToDateBaselineActualEnergyUse(currentMonthData);
        this.setYearToDateActualEnergyUse();
        this.setAdjusted(currentMonthData);
        this.setYearToDateAdjustedEnergyUse();
        this.setBaselineAdjustmentForOtherV2(currentMonthData, baselineAdjustmentForNew);
        this.setSEnPI();
        this.setSavings(currentMonthData);
        this.setPercentSavingsComparedToBaseline();
        this.setYearToDateSavings(baselineYear);
        this.setBaselineAdjustmentForNormalization(currentMonthData);
        this.setBaselineAdjustment(currentMonthData);
        this.setRollingSavingsValues(previousMonthsValues)
        this.setYearToDatePercentSavings();
    }


    initializeYearToDateValues(previousMonthsValues: Array<MonthlyAnalysisCalculatedValuesSummation>) {
        this.summaryDataIndex = previousMonthsValues.length;
        if (this.summaryDataIndex == 0) {
            this.monthIndex = 0;
            this.yearToDateBaselineActualEnergyUse = 0;
            this.yearToDateActualEnergyUse = 0;
            this.yearToDateAdjustedEnergyUse = 0;
        } else {
            let previousMonthSummaryData: MonthlyAnalysisCalculatedValuesSummation = previousMonthsValues[this.summaryDataIndex - 1];
            if (previousMonthSummaryData.fiscalYear == this.fiscalYear) {
                this.monthIndex = previousMonthSummaryData.monthIndex + 1;
                this.yearToDateBaselineActualEnergyUse = previousMonthSummaryData.yearToDateBaselineActualEnergyUse;
                this.yearToDateActualEnergyUse = previousMonthSummaryData.yearToDateActualEnergyUse;
                this.yearToDateAdjustedEnergyUse = previousMonthSummaryData.yearToDateAdjustedEnergyUse;
            } else {
                this.monthIndex = 0;
                this.yearToDateBaselineActualEnergyUse = 0;
                this.yearToDateActualEnergyUse = 0;
                this.yearToDateAdjustedEnergyUse = 0;
            }
        }
    }


    setEnergyUse(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.energyUse = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.energyUse;
        });
    }

    setYearToDateBaselineActualEnergyUse(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.yearToDateBaselineActualEnergyUse = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.yearToDateBaselineActualEnergyUse;
        });
    }

    setYearToDateActualEnergyUse() {
        this.yearToDateActualEnergyUse = this.yearToDateActualEnergyUse + this.energyUse;
    }

    setAdjusted(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.adjusted = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.adjusted;
        });
    }

    setYearToDateAdjustedEnergyUse() {
        this.yearToDateAdjustedEnergyUse = this.yearToDateAdjustedEnergyUse + this.adjusted;
    }

    setBaselineAdjustmentForOtherV2(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>, baselineAdjustmentForNew: number) {
        this.baselineAdjustmentForOtherV2 = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.baselineAdjustmentForOtherV2;
        });
        this.baselineAdjustmentForOtherV2 = this.baselineAdjustmentForOtherV2 + baselineAdjustmentForNew;
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.savings = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.savings;
        });
    }

    setPercentSavingsComparedToBaseline() {
        this.percentSavingsComparedToBaseline = this.savings / this.adjusted;
    }

    setYearToDateSavings(baselineYear: number) {
        if (this.fiscalYear != baselineYear) {
            this.yearToDateSavings = (this.yearToDateAdjustedEnergyUse - this.yearToDateActualEnergyUse)

        } else {
            this.yearToDateSavings = 0;
        }
    }

    setBaselineAdjustmentForNormalization(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.baselineAdjustmentForNormalization = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization;
        });
    }

    setBaselineAdjustment(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.baselineAdjustment = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.baselineAdjustment;
        }) + this.baselineAdjustmentForOtherV2;
    }

    setRollingSavingsValues(previousMonthsValues: Array<MonthlyAnalysisCalculatedValuesSummation>) {
        if (this.summaryDataIndex > 11) {
            let last11MonthsData: Array<MonthlyAnalysisCalculatedValuesSummation> = previousMonthsValues.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
            let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, (data: MonthlyAnalysisCalculatedValuesSummation) => { return data.energyUse }) + this.energyUse;
            let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, (data: MonthlyAnalysisCalculatedValuesSummation) => { return data.adjusted }) + this.adjusted;
            this.rollingSavings = total12MonthsAdjusedBaseline - total12MonthsEnergyUse;
            this.rolling12MonthImprovement = this.rollingSavings / total12MonthsAdjusedBaseline;
        } else {
            this.rolling12MonthImprovement = 0;
            this.rollingSavings = 0;
        }
    }

    setYearToDatePercentSavings() {
        this.yearToDatePercentSavings = (this.yearToDateSavings / this.yearToDateAdjustedEnergyUse)
    }

    convertResults(startingUnit: string, endingUnit: string) {
        this.energyUse = new ConvertValue(this.energyUse, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustmentForNormalization = new ConvertValue(this.baselineAdjustmentForNormalization, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustmentForOtherV2 = new ConvertValue(this.baselineAdjustmentForOtherV2, startingUnit, endingUnit).convertedValue;
        this.adjusted = new ConvertValue(this.adjusted, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustment = new ConvertValue(this.baselineAdjustment, startingUnit, endingUnit).convertedValue;
        this.savings = new ConvertValue(this.savings, startingUnit, endingUnit).convertedValue;
        this.yearToDateSavings = new ConvertValue(this.yearToDateSavings, startingUnit, endingUnit).convertedValue;
        this.rollingSavings = new ConvertValue(this.rollingSavings, startingUnit, endingUnit).convertedValue;
    }
}