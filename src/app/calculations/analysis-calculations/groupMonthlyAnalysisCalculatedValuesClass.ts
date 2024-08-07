import * as _ from 'lodash';
import { ConvertValue } from '../conversions/convertValue';
export class GroupMonthlyAnalysisCalculatedValues {
    //results
    energyUse: number;
    modeledEnergy: number;
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

    adjustedStar: number;
    adjustedStarStar: number;
    baselineAdjustmentForOtherV2: number;
    constructor(
        energyUse: number,
        modeledEnergy: number,
        baselineAdjustementInput: number,
        fiscalYear: number,
        baselineYear: number,
        previousMonthValues: Array<GroupMonthlyAnalysisCalculatedValues>,
        baselineActualEnergyUse: number,
        modelYearDataAdjusted: number,
        dataAdjustment: number
    ) {
        this.energyUse = energyUse;
        this.modeledEnergy = modeledEnergy;
        this.fiscalYear = fiscalYear;
        this.initializeYearToDateValues(previousMonthValues);
        this.setYearToDateBaselineActualEnergyUse(baselineActualEnergyUse);
        this.setYearToDateModeledEnergyUse();
        this.setYearToDateActualEnergyUse();
        this.setBaselineModeledEnergyUse(baselineYear, previousMonthValues);
        this.setAdjustedStar(baselineActualEnergyUse, modelYearDataAdjusted, baselineAdjustementInput);
        this.setAdjustedStarStar(dataAdjustment);
        this.setAdjusted();
        this.setBaselineAdjustmentForNormalization(baselineActualEnergyUse, modelYearDataAdjusted, dataAdjustment);
        this.setBaselineAdjustmentForOtherV2(baselineAdjustementInput, modelYearDataAdjusted, dataAdjustment, baselineActualEnergyUse);
        this.setBaselineAdjustment();
        this.setSEnPI();
        this.setSavings(baselineActualEnergyUse, baselineAdjustementInput, modelYearDataAdjusted, dataAdjustment);
        this.setPercentSavingsComparedToBaseline();
        this.setYearToDateSavings(baselineYear);
        this.setRollingSavingsValues(previousMonthValues);
        this.setYearToDatePercentSavings();
    }

    initializeYearToDateValues(previousMonthsValues: Array<GroupMonthlyAnalysisCalculatedValues>) {
        this.summaryDataIndex = previousMonthsValues.length;
        if (this.summaryDataIndex == 0) {
            this.monthIndex = 0;
            this.yearToDateBaselineActualEnergyUse = 0;
            this.yearToDateModeledEnergyUse = 0;
            this.yearToDateActualEnergyUse = 0;
            this.yearToDateBaselineModeledEnergyUse = 0;
            this.yearToDateAdjustedEnergyUse = 0;
        } else {
            let previousMonthSummaryData: GroupMonthlyAnalysisCalculatedValues = previousMonthsValues[this.summaryDataIndex - 1];
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

    setBaselineModeledEnergyUse(baselineYear: number, previousMonthsValues: Array<GroupMonthlyAnalysisCalculatedValues>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineModeledEnergyUse = this.modeledEnergy;
        } else {
            this.baselineModeledEnergyUse = previousMonthsValues[this.monthIndex].modeledEnergy;
        }
        this.yearToDateBaselineModeledEnergyUse = this.yearToDateBaselineModeledEnergyUse + this.baselineModeledEnergyUse;
    }

    setAdjustedStar(baselineActualEnergyUse: number, modelYearDataAdjusted: number, baselineAdjustementInput: number) {
        if (this.baselineModeledEnergyUse - modelYearDataAdjusted == 0) {
            if (this.modeledEnergy - modelYearDataAdjusted == 0) {  //M_i = 0 subcase is the weird one
                this.adjustedStar = (baselineActualEnergyUse + baselineAdjustementInput);
            } else {
                this.adjustedStar = (this.modeledEnergy - modelYearDataAdjusted)
            }
        } else {
            this.adjustedStar = (baselineActualEnergyUse + baselineAdjustementInput) * ((this.modeledEnergy - modelYearDataAdjusted) / (this.baselineModeledEnergyUse - modelYearDataAdjusted));
        }
    }

    setAdjustedStarStar(dataAdjustment: number) {
        if (this.energyUse == 0) {
            this.adjustedStarStar = this.adjustedStar;
        } else {
            this.adjustedStarStar = this.adjustedStar * this.energyUse / (this.energyUse - dataAdjustment);
        }
    }

    setAdjusted() {
        this.adjusted = this.adjustedStarStar;
        this.yearToDateAdjustedEnergyUse = this.yearToDateAdjustedEnergyUse + this.adjusted;
    }

    setBaselineAdjustmentForOtherV2(baselineAdjustementInput: number, modelYearDataAdjusted: number, dataAdjustment: number, baselineActualEnergyUse: number) {
        if ((this.energyUse - dataAdjustment) == 0 && this.energyUse != 0) {
            this.baselineAdjustmentForOtherV2 = baselineAdjustementInput;
        } else {
            let adjustedStarStarRatio: number = 1;
            if (this.energyUse != 0) {
                adjustedStarStarRatio = this.energyUse / (this.energyUse - dataAdjustment);
            }

            if ((this.baselineModeledEnergyUse - modelYearDataAdjusted) == 0) {
                if ((this.modeledEnergy - modelYearDataAdjusted) == 0) {
                    this.baselineAdjustmentForOtherV2 = baselineAdjustementInput * adjustedStarStarRatio;
                } else {
                    this.baselineAdjustmentForOtherV2 = 0;
                }
            } else {
                this.baselineAdjustmentForOtherV2 = baselineAdjustementInput * ((this.modeledEnergy - modelYearDataAdjusted) / (this.baselineModeledEnergyUse - modelYearDataAdjusted)) * adjustedStarStarRatio;
            }
        }
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings(baselineActualEnergyUse: number, baselineAdjustementInput: number, modelYearDataAdjusted: number, dataAdjustment: number) {
        if ((baselineActualEnergyUse + baselineAdjustementInput) != 0 && (this.baselineModeledEnergyUse - modelYearDataAdjusted) != 0 && (this.modeledEnergy - modelYearDataAdjusted) != 0) {
            this.savings = this.adjusted - this.energyUse;
        } else {
            this.savings = ((baselineActualEnergyUse + baselineAdjustementInput) - (this.baselineModeledEnergyUse - modelYearDataAdjusted)) + ((this.modeledEnergy - modelYearDataAdjusted) - (this.energyUse - dataAdjustment))
        }
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

    setBaselineAdjustmentForNormalization(baselineActualEnergyUse: number, modelYearDataAdjustment: number, dataAdjustment: number) {
        if (this.summaryDataIndex >= 11) {
            let adjustedStarStarRatio: number = 1;
            if (this.energyUse != 0) {
                adjustedStarStarRatio = this.energyUse / (this.energyUse - dataAdjustment);
            }
            if ((this.baselineModeledEnergyUse - modelYearDataAdjustment) == 0) {
                if ((this.modeledEnergy - modelYearDataAdjustment) == 0) {
                    this.baselineAdjustmentForNormalization = baselineActualEnergyUse * adjustedStarStarRatio - baselineActualEnergyUse;
                } else {
                    this.baselineAdjustmentForNormalization = (this.modeledEnergy - modelYearDataAdjustment) * adjustedStarStarRatio - baselineActualEnergyUse;
                }
            } else {
                this.baselineAdjustmentForNormalization = baselineActualEnergyUse * ((this.modeledEnergy - modelYearDataAdjustment) / (this.baselineModeledEnergyUse - modelYearDataAdjustment)) * adjustedStarStarRatio - baselineActualEnergyUse
            }
        } else {
            this.baselineAdjustmentForNormalization = 0;
        }
    }

    setBaselineAdjustment() {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustment = this.baselineAdjustmentForNormalization + this.baselineAdjustmentForOtherV2;
        } else {
            this.baselineAdjustment = 0;
        }
    }

    setRollingSavingsValues(previousMonthsValues: Array<GroupMonthlyAnalysisCalculatedValues>) {
        if (this.summaryDataIndex > 11) {
            let last11MonthsData: Array<GroupMonthlyAnalysisCalculatedValues> = previousMonthsValues.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
            let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisCalculatedValues) => { return data.energyUse }) + this.energyUse;
            let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisCalculatedValues) => { return data.adjusted }) + this.adjusted;
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
        this.baselineAdjustmentForNormalization = new ConvertValue(this.baselineAdjustmentForNormalization, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustmentForOtherV2 = new ConvertValue(this.baselineAdjustmentForOtherV2, startingUnit, endingUnit).convertedValue;
        this.adjusted = new ConvertValue(this.adjusted, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustment = new ConvertValue(this.baselineAdjustment, startingUnit, endingUnit).convertedValue;
        this.savings = new ConvertValue(this.savings, startingUnit, endingUnit).convertedValue;
        this.yearToDateSavings = new ConvertValue(this.yearToDateSavings, startingUnit, endingUnit).convertedValue;
        this.rollingSavings = new ConvertValue(this.rollingSavings, startingUnit, endingUnit).convertedValue;
    }
}