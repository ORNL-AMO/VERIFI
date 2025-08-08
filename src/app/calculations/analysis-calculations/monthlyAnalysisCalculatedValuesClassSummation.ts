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
    savingsBanked: number;
    savingsUnbanked: number;
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

    //1964
    rollingAdjusted: number;

    fivePercentTarget: number;
    tenPercentTarget: number;
    fifteenPercentTarget: number;
    rollingActual: number;
    fifteenPercentSavings: number;
    tenPercentSavings: number;
    fivePercentSavings: number;
    thirtyPercentTarget: number;
    thirtyPercentSavings: number;
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
        this.setFivePercentTarget();
        this.setTenPercentTarget();
        this.setFifteenPercentTarget();
        this.setFifteenPercentSavings();
        this.setTenPercentSavings();    
        this.setFivePercentSavings();
        this.setThirtyPercentTarget();
        this.setThirtyPercentSavings();
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
            return data.monthlyAnalysisRollingValues.energyUse;
        });
    }

    setYearToDateBaselineActualEnergyUse(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.yearToDateBaselineActualEnergyUse = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.yearToDateBaselineActualEnergyUse;
        });
    }

    setYearToDateActualEnergyUse() {
        this.yearToDateActualEnergyUse = this.yearToDateActualEnergyUse + this.energyUse;
    }

    setAdjusted(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.adjusted = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.adjusted;
        });
    }

    setYearToDateAdjustedEnergyUse() {
        this.yearToDateAdjustedEnergyUse = this.yearToDateAdjustedEnergyUse + this.adjusted;
    }

    setBaselineAdjustmentForOtherV2(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>, baselineAdjustmentForNew: number) {
        this.baselineAdjustmentForOtherV2 = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.baselineAdjustmentForOtherV2;
        });
        this.baselineAdjustmentForOtherV2 = this.baselineAdjustmentForOtherV2 + baselineAdjustmentForNew;
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.savings = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.savings;
        });

        this.savingsUnbanked = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.savingsUnbanked;
        });

        this.savingsBanked = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.savingsBanked;
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
            return data.monthlyAnalysisRollingValues.baselineAdjustmentForNormalization;
        });
    }

    setBaselineAdjustment(currentMonthData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.baselineAdjustment = _.sumBy(currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.monthlyAnalysisRollingValues.baselineAdjustment;
        });
    }

    setRollingSavingsValues(previousMonthsValues: Array<MonthlyAnalysisCalculatedValuesSummation>) {
        if (this.summaryDataIndex > 11) {
            let last11MonthsData: Array<MonthlyAnalysisCalculatedValuesSummation> = previousMonthsValues.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
            this.rollingAdjusted = _.sumBy(last11MonthsData, (data: MonthlyAnalysisCalculatedValuesSummation) => { return data.adjusted }) + this.adjusted;
            this.rollingSavings = _.sumBy(last11MonthsData, (data: MonthlyAnalysisCalculatedValuesSummation) => { return data.savings }) + this.savings;
            this.rolling12MonthImprovement = this.rollingSavings / this.rollingAdjusted;
            this.rollingActual = _.sumBy(last11MonthsData, (data: MonthlyAnalysisCalculatedValuesSummation) => { return data.energyUse }) + this.energyUse;
        } else {
            this.rolling12MonthImprovement = 0;
            this.rollingSavings = 0;
            this.rollingAdjusted = 0;
            this.rollingActual = 0;
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
        this.fivePercentTarget = new ConvertValue(this.fivePercentTarget, startingUnit, endingUnit).convertedValue;
        this.tenPercentTarget = new ConvertValue(this.tenPercentTarget, startingUnit, endingUnit).convertedValue;
        this.fifteenPercentTarget = new ConvertValue(this.fifteenPercentTarget, startingUnit, endingUnit).convertedValue;
        this.fifteenPercentSavings = new ConvertValue(this.fifteenPercentSavings, startingUnit, endingUnit).convertedValue;
        this.tenPercentSavings = new ConvertValue(this.tenPercentSavings, startingUnit, endingUnit).convertedValue;
        this.fivePercentSavings = new ConvertValue(this.fivePercentSavings, startingUnit, endingUnit).convertedValue;
        this.thirtyPercentTarget = new ConvertValue(this.thirtyPercentTarget, startingUnit, endingUnit).convertedValue;
        this.thirtyPercentSavings = new ConvertValue(this.thirtyPercentSavings, startingUnit, endingUnit).convertedValue;
    }

    //1964
    setFivePercentTarget() {
        this.fivePercentTarget = this.rollingAdjusted * 0.95;
    }
    setTenPercentTarget() {
        this.tenPercentTarget = this.rollingAdjusted * 0.90;
    }
    setFifteenPercentTarget() {
        this.fifteenPercentTarget = this.rollingAdjusted * 0.85;
    }
    setThirtyPercentTarget() {
        this.thirtyPercentTarget = this.rollingAdjusted * 0.70;
    }

    setFifteenPercentSavings() {
        this.fifteenPercentSavings = this.rollingAdjusted - this.fifteenPercentTarget;
    }
    setTenPercentSavings() {
        this.tenPercentSavings = this.rollingAdjusted - this.tenPercentTarget;
    }
    setFivePercentSavings() {
        this.fivePercentSavings = this.rollingAdjusted - this.fivePercentTarget;
    }
    setThirtyPercentSavings() {
        this.thirtyPercentSavings = this.rollingAdjusted - this.thirtyPercentTarget;
    }
}