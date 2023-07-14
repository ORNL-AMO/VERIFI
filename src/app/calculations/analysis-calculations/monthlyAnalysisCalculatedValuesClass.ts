import * as _ from 'lodash';
import { ConvertValue } from '../conversions/convertValue';
export class MonthlyAnalysisCalculatedValues {
    //results
    energyUse: number;
    modeledEnergy: number;
    adjustedForNormalization: number;
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
    yearToDateModeledEnergyUse: number;
    yearToDateActualEnergyUse: number;
    yearToDateBaselineModeledEnergyUse: number;
    yearToDateAdjustedEnergyUse: number;
    summaryDataIndex: number;
    baselineModeledEnergyUse: number;
    monthIndex: number;
    constructor(
        energyUse: number,
        modeledEnergy: number,
        baselineAdjustmentForOther: number,
        fiscalYear: number,
        baselineYear: number,
        previousMonthValues: Array<MonthlyAnalysisCalculatedValues>,
        baselineActualEnergyUse: number
    ) {
        this.energyUse = energyUse;
        this.modeledEnergy = modeledEnergy;
        this.fiscalYear = fiscalYear;
        this.initializeYearToDateValues(previousMonthValues);
        this.setYearToDateBaselineActualEnergyUse(baselineActualEnergyUse);
        this.setYearToDateModeledEnergyUse();
        this.setYearToDateActualEnergyUse();
        this.setBaselineModeledEnergyUse(baselineYear, previousMonthValues);
        this.setAdjustedForNormalization(baselineActualEnergyUse);
        this.setAdjusted(baselineAdjustmentForOther);
        this.setSEnPI();
        this.setSavings();
        this.setPercentSavingsComparedToBaseline();
        this.setYearToDateSavings(baselineYear);
        this.setBaselineAdjustmentForNormalization(baselineActualEnergyUse);
        this.setBaselineAdjustment(baselineAdjustmentForOther);
        this.setRollingSavingsValues(previousMonthValues);
        this.setYearToDatePercentSavings();
    }

    initializeYearToDateValues(previousMonthsValues: Array<MonthlyAnalysisCalculatedValues>) {
        this.summaryDataIndex = previousMonthsValues.length;
        if (this.summaryDataIndex == 0) {
            this.monthIndex = 0;
            this.yearToDateBaselineActualEnergyUse = 0;
            this.yearToDateModeledEnergyUse = 0;
            this.yearToDateActualEnergyUse = 0;
            this.yearToDateBaselineModeledEnergyUse = 0;
            this.yearToDateAdjustedEnergyUse = 0;
        } else {
            let previousMonthSummaryData: MonthlyAnalysisCalculatedValues = previousMonthsValues[this.summaryDataIndex - 1];
            if (previousMonthSummaryData.fiscalYear == this.fiscalYear) {
                this.monthIndex = previousMonthSummaryData.monthIndex + 1;
                this.yearToDateBaselineActualEnergyUse = previousMonthSummaryData.yearToDateBaselineActualEnergyUse;
                this.yearToDateModeledEnergyUse = previousMonthSummaryData.yearToDateModeledEnergyUse;
                this.yearToDateActualEnergyUse = previousMonthSummaryData.yearToDateActualEnergyUse;
                this.yearToDateBaselineModeledEnergyUse = previousMonthSummaryData.yearToDateBaselineModeledEnergyUse;
                this.yearToDateAdjustedEnergyUse = previousMonthSummaryData.yearToDateAdjustedEnergyUse;
            } else {
                this.monthIndex = 0;
                this.yearToDateBaselineActualEnergyUse = 0;
                this.yearToDateModeledEnergyUse = 0;
                this.yearToDateActualEnergyUse = 0;
                this.yearToDateBaselineModeledEnergyUse = 0;
                this.yearToDateAdjustedEnergyUse = 0;
            }
        }
    }

    setYearToDateBaselineActualEnergyUse(baselineActualEnergyUse: number) {
        this.yearToDateBaselineActualEnergyUse = this.yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;
    }

    setYearToDateModeledEnergyUse() {
        this.yearToDateModeledEnergyUse = this.yearToDateModeledEnergyUse + this.modeledEnergy;
    }

    setYearToDateActualEnergyUse() {
        this.yearToDateActualEnergyUse = this.yearToDateActualEnergyUse + this.energyUse;
    }

    setBaselineModeledEnergyUse(baselineYear: number, previousMonthsValues: Array<MonthlyAnalysisCalculatedValues>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineModeledEnergyUse = this.modeledEnergy;
        } else {
            this.baselineModeledEnergyUse = previousMonthsValues[this.monthIndex].modeledEnergy;
        }
        this.yearToDateBaselineModeledEnergyUse = this.yearToDateBaselineModeledEnergyUse + this.baselineModeledEnergyUse;
    }

    setAdjustedForNormalization(baselineActualEnergyUse: number) {
        this.adjustedForNormalization = this.modeledEnergy + baselineActualEnergyUse - this.baselineModeledEnergyUse;
    }

    setAdjusted(baselineAdjustmentForOther: number) {
        this.adjusted = this.adjustedForNormalization + baselineAdjustmentForOther;
        this.yearToDateAdjustedEnergyUse = this.yearToDateAdjustedEnergyUse + this.adjusted;
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings() {
        this.savings = this.adjusted - this.energyUse;
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

    setBaselineAdjustmentForNormalization(baselineActualEnergyUse: number) {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustmentForNormalization = this.adjustedForNormalization - baselineActualEnergyUse;
            if ((this.baselineAdjustmentForNormalization > 0 && this.baselineAdjustmentForNormalization < 0.00001) || (this.baselineAdjustmentForNormalization < 0 && this.baselineAdjustmentForNormalization > -0.00001)) {
                this.baselineAdjustmentForNormalization = 0;
            }
        } else {
            this.baselineAdjustmentForNormalization = 0;
        }
    }

    setBaselineAdjustment(baselineAdjustmentForOther: number) {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustment = this.baselineAdjustmentForNormalization + baselineAdjustmentForOther;
            if ((this.baselineAdjustment > 0 && this.baselineAdjustment < 0.00001) || (this.baselineAdjustment < 0 && this.baselineAdjustment > -0.00001)) {
                this.baselineAdjustment = 0;
            }
        } else {
            this.baselineAdjustment = 0;
        }
    }

    setRollingSavingsValues(previousMonthsValues: Array<MonthlyAnalysisCalculatedValues>) {
        if (this.summaryDataIndex > 11) {
            let last11MonthsData: Array<MonthlyAnalysisCalculatedValues> = previousMonthsValues.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
            let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, 'energyUse') + this.energyUse;
            let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, 'adjusted') + this.adjusted;
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
        this.modeledEnergy = new ConvertValue(this.modeledEnergy, startingUnit, endingUnit).convertedValue;
        this.adjustedForNormalization = new ConvertValue(this.adjustedForNormalization, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustmentForNormalization = new ConvertValue(this.baselineAdjustmentForNormalization, startingUnit, endingUnit).convertedValue;
        this.adjusted = new ConvertValue(this.adjusted, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustment = new ConvertValue(this.baselineAdjustment, startingUnit, endingUnit).convertedValue;
        this.savings = new ConvertValue(this.savings, startingUnit, endingUnit).convertedValue;
        this.yearToDateSavings = new ConvertValue(this.yearToDateSavings, startingUnit, endingUnit).convertedValue;
        this.rollingSavings = new ConvertValue(this.rollingSavings, startingUnit, endingUnit).convertedValue;
    }
}