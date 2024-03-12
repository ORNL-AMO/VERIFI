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
        baselineAdjustmentForNew: number
    ) {
        this.setEnergyUse(currentMonthData);
        this.setYearToDateBaselineActualEnergyUse(currentMonthData);
        this.setYearToDateActualEnergyUse(currentMonthData);
        this.setAdjusted(currentMonthData);
        this.setYearToDateAdjustedEnergyUse(currentMonthData);
        this.setBaselineAdjustmentForOtherV2(currentMonthData, baselineAdjustmentForNew);
        this.setSEnPI(currentMonthData);
        this.setSavings(currentMonthData);
        this.setPercentSavingsComparedToBaseline(currentMonthData);
        this.setYearToDateSavings(currentMonthData);
        this.setBaselineAdjustmentForNormalization(currentMonthData);
        this.setBaselineAdjustment(currentMonthData);
        this.setRollingSavings(currentMonthData);
        this.setRolling12MonthImprovement(currentMonthData);
        this.setYearToDatePercentSavings(currentMonthData);
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

    setYearToDateActualEnergyUse(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.yearToDateActualEnergyUse = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.yearToDateActualEnergyUse;
        });
    }

    setAdjusted(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.adjusted = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.adjusted;
        });
    }

    setYearToDateAdjustedEnergyUse(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.yearToDateAdjustedEnergyUse = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.yearToDateAdjustedEnergyUse;
        });
    }

    setBaselineAdjustmentForOtherV2(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>, baselineAdjustmentForNew: number) {
        this.baselineAdjustmentForOtherV2 = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.baselineAdjustmentForOtherV2;
        });
        this.baselineAdjustmentForOtherV2 = this.baselineAdjustmentForOtherV2 + baselineAdjustmentForNew;
    }

    setSEnPI(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.SEnPI = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.SEnPI;
        });
    }

    setSavings(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.savings = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.savings;
        });
    }

    setPercentSavingsComparedToBaseline(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.percentSavingsComparedToBaseline = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline;
        });
    }

    setYearToDateSavings(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.yearToDateSavings = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.yearToDateSavings;
        });
    }

    setBaselineAdjustmentForNormalization(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.baselineAdjustmentForNormalization = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization;
        });
    }

    setBaselineAdjustment(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.baselineAdjustment = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.baselineAdjustment;
        });
    }

    setRollingSavings(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.rollingSavings = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.rollingSavings;
        });
    }

    setRolling12MonthImprovement(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.rolling12MonthImprovement = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.rolling12MonthImprovement;
        });
    }

    setYearToDatePercentSavings(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.yearToDatePercentSavings = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisCalculatedValues.yearToDatePercentSavings;
        });
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