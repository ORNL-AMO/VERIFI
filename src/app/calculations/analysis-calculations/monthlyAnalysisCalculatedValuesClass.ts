import * as _ from 'lodash';
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
        ){
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
        this.setRollingSavingsValues(previousMonthValues, baselineYear);
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

    setYearToDateBaselineActualEnergyUse(baselineActualEnergyUse: number){
        this.yearToDateBaselineActualEnergyUse = this.yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;
    }

    setYearToDateModeledEnergyUse(){
        this.yearToDateModeledEnergyUse = this.yearToDateModeledEnergyUse + this.modeledEnergy;
    }

    setYearToDateActualEnergyUse(){
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
        if(this.fiscalYear != baselineYear){
            this.yearToDateSavings = (this.yearToDateBaselineActualEnergyUse - this.yearToDateBaselineModeledEnergyUse) - (this.yearToDateActualEnergyUse - this.yearToDateModeledEnergyUse);

        }else{
            this.yearToDateSavings = 0;
        }
    }

    setBaselineAdjustmentForNormalization(baselineActualEnergyUse: number) {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustmentForNormalization = this.adjustedForNormalization - baselineActualEnergyUse;
        } else {
            this.baselineAdjustmentForNormalization = 0;
        }
    }

    setBaselineAdjustment(baselineAdjustmentForOther: number) {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustment = this.baselineAdjustmentForNormalization + baselineAdjustmentForOther;
        } else {
            this.baselineAdjustment = 0;
        }
    }

    setRollingSavingsValues(previousMonthsValues: Array<MonthlyAnalysisCalculatedValues>, baselineYear: number) {
        if (this.summaryDataIndex > 11) {
            let baselineMonthsSummaryData: Array<MonthlyAnalysisCalculatedValues> = previousMonthsValues.filter(dataItem => { return dataItem.fiscalYear == baselineYear });
            let totalBaselineModeledEnergy: number = _.sumBy(baselineMonthsSummaryData, 'modeledEnergy');
            let totalBaselineEnergy: number = _.sumBy(baselineMonthsSummaryData, 'energyUse');
            // let last11MonthsData: Array<MonthlyAnalysisCalculatedValues> = JSON.parse(JSON.stringify(previousMonthsValues));
            let last11MonthsData: Array<MonthlyAnalysisCalculatedValues> = previousMonthsValues.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
            let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, 'energyUse') + this.energyUse;
            let total12MonthsModeledEnergy: number = _.sumBy(last11MonthsData, 'modeledEnergy') + this.modeledEnergy;
            this.rollingSavings = (totalBaselineEnergy - totalBaselineModeledEnergy) - (total12MonthsEnergyUse - total12MonthsModeledEnergy);
            let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, 'adjusted') + this.adjusted;
            this.rolling12MonthImprovement = this.rollingSavings / total12MonthsAdjusedBaseline;
        } else {
            this.rolling12MonthImprovement = 0;
            this.rollingSavings = 0;
        }
    }

    setYearToDatePercentSavings(){
        this.yearToDatePercentSavings = (this.yearToDateSavings / this.yearToDateAdjustedEnergyUse)
    }
}