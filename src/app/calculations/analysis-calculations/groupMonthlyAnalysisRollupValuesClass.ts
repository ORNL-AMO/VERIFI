import * as _ from 'lodash';
import { ConvertValue } from '../conversions/convertValue';
import { MonthlyAnalysisSummaryDataClass } from './monthlyAnalysisSummaryDataClass';
export class GroupMonthlyAnalysisRollupValues {
    //results
    energyUse: number;
    modeledEnergy: number;

    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustment: number;
    fiscalYear: number;
    SEnPI: number;

    savings: number;
    savingsUnbanked: number;
    savingsBanked: number

    percentSavingsComparedToBaseline: number;

    yearToDateSavings: number;
    yearToDatePercentSavings: number;

    rollingUnbankedSavings: number;
    rollingBankedSavings: number;
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

    // adjustedStar: number;
    // adjustedStarStar: number;
    baselineAdjustmentForOtherV2: number;


    //new math vars
    rollingActual: number;
    rollingModeled: number;
    rollingActualBaseline: number;
    rollingModeledBaseline: number;
    rollingAdjusted: number;
    constructor(
        energyUse: number,
        modeledEnergy: number,
        baselineAdjustementInput: number,
        fiscalYear: number,
        baselineOrBankedYear: boolean,
        previousMonthValues: Array<GroupMonthlyAnalysisRollupValues>,
        baselineActualEnergyUse: number,
        modelYearDataAdjusted: number,
        dataAdjustment: number,
        lastBankedMonthSummaryData: MonthlyAnalysisSummaryDataClass,
        originalBaselineYearBaselineActualEnergyUse: number
    ) {
        this.energyUse = energyUse;
        this.modeledEnergy = modeledEnergy;
        this.fiscalYear = fiscalYear;
        if (previousMonthValues.length > 10) {
            //step 1
            this.setRollingVals(previousMonthValues);
            //step 2
            this.setAdjusted(modelYearDataAdjusted, baselineAdjustementInput, dataAdjustment);
            //step 3
            this.setAdjustedSavings(lastBankedMonthSummaryData);
            //step 4
            this.setPercentSavings();
            //step 5
            this.setMonthlySavings(previousMonthValues);
            //step 6
            this.setMonthlyAdjustedBaseline(previousMonthValues);
            //step 7
            this.setAdjustmentForNormalization(modelYearDataAdjusted, dataAdjustment);
            //step 8
            this.setAdjustmentForOtherV3(baselineAdjustementInput, modelYearDataAdjusted, dataAdjustment);
        } else {
            this.setBaselineYearValues();
        }

        this.initializeYearToDateValues(previousMonthValues);
        this.setYearToDateBaselineActualEnergyUse(baselineActualEnergyUse);
        this.setYearToDateModeledEnergyUse();
        this.setYearToDateActualEnergyUse();
        this.setBaselineModeledEnergyUse(baselineOrBankedYear, previousMonthValues);
        this.setSEnPI();
        this.setPercentSavingsComparedToBaseline();
        this.setYearToDateSavings(baselineOrBankedYear);
        this.setYearToDatePercentSavings();
    }

    setBaselineYearValues() {
        this.adjusted = this.energyUse;
        this.savings = 0;
        this.savingsUnbanked = 0;
        this.savingsBanked = 0;
        this.baselineAdjustmentForNormalization = 0;
        this.baselineAdjustmentForOtherV2 = 0;
    }


    initializeYearToDateValues(previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        this.summaryDataIndex = previousMonthsValues.length;
        if (this.summaryDataIndex == 0) {
            this.monthIndex = 0;
            this.yearToDateBaselineActualEnergyUse = 0;
            this.yearToDateModeledEnergyUse = 0;
            this.yearToDateActualEnergyUse = 0;
            this.yearToDateBaselineModeledEnergyUse = 0;
            this.yearToDateAdjustedEnergyUse = 0;
        } else {
            let previousMonthSummaryData: GroupMonthlyAnalysisRollupValues = previousMonthsValues[this.summaryDataIndex - 1];
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

    setBaselineModeledEnergyUse(baselineOrBankedYear: boolean, previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        if (baselineOrBankedYear) {
            this.baselineModeledEnergyUse = this.modeledEnergy;
        } else {
            this.baselineModeledEnergyUse = previousMonthsValues[this.monthIndex].modeledEnergy;
        }
        this.yearToDateBaselineModeledEnergyUse = this.yearToDateBaselineModeledEnergyUse + this.baselineModeledEnergyUse;
    }

    //step 1
    setRollingVals(previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        let previousMonthData: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsValues.map(val => {
            return val;
        });
        let baselineValues: Array<GroupMonthlyAnalysisRollupValues> = previousMonthData.slice(0, 12);
        this.rollingActualBaseline = _.sumBy(baselineValues, (val: GroupMonthlyAnalysisRollupValues) => {
            return val.energyUse;
        });
        this.rollingModeledBaseline = _.sumBy(baselineValues, (val: GroupMonthlyAnalysisRollupValues) => {
            return val.modeledEnergy;
        });
        //december of baseline include usage
        if (baselineValues.length == 11) {
            this.rollingActualBaseline += this.energyUse;
            this.rollingModeledBaseline += this.modeledEnergy;
        }

        let startVal: number = previousMonthData.length - 11;
        let rollingValues: Array<GroupMonthlyAnalysisRollupValues> = previousMonthData.slice(startVal, previousMonthData.length);
        this.rollingActual = _.sumBy(rollingValues, (val: GroupMonthlyAnalysisRollupValues) => {
            return val.energyUse;
        }) + this.energyUse;
        this.rollingModeled = _.sumBy(rollingValues, (val: GroupMonthlyAnalysisRollupValues) => {
            return val.modeledEnergy;
        }) + this.modeledEnergy;

    }

    //step 2: calculate the BP adjusted baseline
    setAdjusted(modelYearDataAdjusted: number, baselineAdjustementInput: number, dataAdjustment: number) {
        this.rollingAdjusted = (this.rollingActualBaseline + baselineAdjustementInput) * this.getAdjustmentRatio(modelYearDataAdjusted, dataAdjustment);
    }

    //step 3: calculate BP adjusted savings
    setAdjustedSavings(lastBankedMonthSummaryData: MonthlyAnalysisSummaryDataClass) {
        if (lastBankedMonthSummaryData) {
            this.rollingUnbankedSavings = (this.rollingAdjusted - this.rollingActual);
            this.rollingSavings = (1 + lastBankedMonthSummaryData.monthlyAnalysisRollingValues.rolling12MonthImprovement) * (this.rollingAdjusted - this.rollingActual);
            this.rollingBankedSavings = this.rollingUnbankedSavings - this.rollingSavings;
        } else {
            this.rollingSavings = (this.rollingAdjusted - this.rollingActual);
            this.rollingBankedSavings = 0;
            this.rollingUnbankedSavings = this.rollingSavings;
        }
    }

    //step 4: calculate percent savings
    setPercentSavings() {
        this.rolling12MonthImprovement = (this.rollingSavings / this.rollingAdjusted);
    }

    //step 5: calculate monthly savings
    setMonthlySavings(previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        if (previousMonthsValues.length > 10) {
            let startIndex: number = previousMonthsValues.length - 11;
            let last11MonthsData: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsValues.slice(startIndex, previousMonthsValues.length);
            let last11monthsSavings: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.savings;
            });
            let last11monthsBankedSavings: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.rollingBankedSavings;
            });
            let last11monthsUnbankedSavings: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.rollingUnbankedSavings;
            });
            this.savings = this.rollingSavings - last11monthsSavings;
            this.savingsBanked = this.rollingBankedSavings - last11monthsBankedSavings;
            this.savingsUnbanked = this.rollingUnbankedSavings - last11monthsUnbankedSavings;
        } else {
            this.savings = 0;
            this.savingsBanked = 0;
            this.savingsUnbanked = 0;
        }
    }

    //step 6: calculate monthly adjusted baseline
    setMonthlyAdjustedBaseline(previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        if (previousMonthsValues.length > 10) {
            let startIndex: number = previousMonthsValues.length - 11;
            let last11MonthsData: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsValues.slice(startIndex, previousMonthsValues.length);
            let last11monthsBaselineAdjustment: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.adjusted;
            })
            this.adjusted = this.rollingAdjusted - last11monthsBaselineAdjustment;
        } else {
            this.adjusted = this.rollingAdjusted;
        }
        this.yearToDateAdjustedEnergyUse = this.yearToDateAdjustedEnergyUse + this.adjusted;
    }

    //step 7: calculate adjustment for normalization
    setAdjustmentForNormalization(modelYearDataAdjusted: number, dataAdjustment: number) {
        this.baselineAdjustmentForNormalization = (this.rollingActualBaseline * this.getAdjustmentRatio(modelYearDataAdjusted, dataAdjustment)) - this.rollingActualBaseline
    }


    //step 8: calculate adjustment for operational changes
    setAdjustmentForOtherV3(baselineAdjustementInput: number, modelYearDataAdjusted: number, dataAdjustment: number) {
        this.baselineAdjustmentForOtherV2 = baselineAdjustementInput * this.getAdjustmentRatio(modelYearDataAdjusted, dataAdjustment);
    }


    getAdjustmentRatio(modelYearDataAdjusted: number, dataAdjustment: number): number {
        return ((this.rollingModeled - modelYearDataAdjusted) / (this.rollingModeledBaseline - modelYearDataAdjusted)) * (this.rollingActual / (this.rollingActual - dataAdjustment));
    }


    // setBaselineAdjustmentForOtherV2(baselineAdjustementInput: number, modelYearDataAdjusted: number, dataAdjustment: number, baselineActualEnergyUse: number, originalBaselineYearBaselineActualEnergyUse: number) {
    //     if ((this.energyUse - dataAdjustment) == 0 && this.energyUse != 0) {
    //         this.baselineAdjustmentForOtherV2 = baselineAdjustementInput;
    //     } else {
    //         let adjustedStarStarRatio: number = 1;
    //         if (this.energyUse != 0) {
    //             adjustedStarStarRatio = this.energyUse / (this.energyUse - dataAdjustment);
    //         }

    //         if ((this.baselineModeledEnergyUse - modelYearDataAdjusted) == 0) {
    //             if ((this.modeledEnergy - modelYearDataAdjusted) == 0) {
    //                 this.baselineAdjustmentForOtherV2 = baselineAdjustementInput * adjustedStarStarRatio;
    //             } else {
    //                 this.baselineAdjustmentForOtherV2 = 0;
    //             }
    //         } else {
    //             this.baselineAdjustmentForOtherV2 = baselineAdjustementInput * ((this.modeledEnergy - modelYearDataAdjusted) / (this.baselineModeledEnergyUse - modelYearDataAdjusted)) * adjustedStarStarRatio;
    //         }
    //     }

    //     //add (new baseline actual - original baseline actual)
    //     if (isNaN(originalBaselineYearBaselineActualEnergyUse) == false && originalBaselineYearBaselineActualEnergyUse != baselineActualEnergyUse) {
    //         this.baselineAdjustmentForOtherV2 = (this.baselineAdjustmentForOtherV2 + (baselineActualEnergyUse - originalBaselineYearBaselineActualEnergyUse));
    //     }
    // }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    // setSavings(baselineActualEnergyUse: number, baselineAdjustementInput: number, modelYearDataAdjusted: number, dataAdjustment: number, lastBankedMonthSummaryData: MonthlyAnalysisSummaryDataClass) {
    //     if ((baselineActualEnergyUse + baselineAdjustementInput) != 0 && (this.baselineModeledEnergyUse - modelYearDataAdjusted) != 0 && (this.modeledEnergy - modelYearDataAdjusted) != 0) {
    //         this.savingsUnbanked = this.adjusted - this.energyUse;
    //         if (lastBankedMonthSummaryData) {
    //             this.savings = ((1 + lastBankedMonthSummaryData.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * this.adjusted) - this.energyUse;
    //         } else {
    //             this.savings = this.savingsUnbanked;
    //         }
    //     } else {
    //         this.savingsUnbanked = ((baselineActualEnergyUse + baselineAdjustementInput) - (this.baselineModeledEnergyUse - modelYearDataAdjusted)) + ((this.modeledEnergy - modelYearDataAdjusted) - (this.energyUse - dataAdjustment))
    //         //TODO: handle banking here..
    //         this.savings = this.savingsUnbanked;
    //     }
    //     this.savingsBanked = (this.savings - this.savingsUnbanked);
    // }

    setPercentSavingsComparedToBaseline() {
        this.percentSavingsComparedToBaseline = this.savings / this.adjusted;
    }

    setYearToDateSavings(baselineOrBankedYear: boolean) {
        if (!baselineOrBankedYear) {
            this.yearToDateSavings = (this.yearToDateAdjustedEnergyUse - this.yearToDateActualEnergyUse)

        } else {
            this.yearToDateSavings = 0;
        }
    }

    // setBaselineAdjustmentForNormalization(baselineActualEnergyUse: number, modelYearDataAdjustment: number, dataAdjustment: number) {
    //     if (this.summaryDataIndex >= 11) {
    //         let adjustedStarStarRatio: number = 1;
    //         if (this.energyUse != 0) {
    //             adjustedStarStarRatio = this.energyUse / (this.energyUse - dataAdjustment);
    //         }
    //         if ((this.baselineModeledEnergyUse - modelYearDataAdjustment) == 0) {
    //             if ((this.modeledEnergy - modelYearDataAdjustment) == 0) {
    //                 this.baselineAdjustmentForNormalization = baselineActualEnergyUse * adjustedStarStarRatio - baselineActualEnergyUse;
    //             } else {
    //                 this.baselineAdjustmentForNormalization = (this.modeledEnergy - modelYearDataAdjustment) * adjustedStarStarRatio - baselineActualEnergyUse;
    //             }
    //         } else {
    //             this.baselineAdjustmentForNormalization = baselineActualEnergyUse * ((this.modeledEnergy - modelYearDataAdjustment) / (this.baselineModeledEnergyUse - modelYearDataAdjustment)) * adjustedStarStarRatio - baselineActualEnergyUse
    //         }
    //     } else {
    //         this.baselineAdjustmentForNormalization = 0;
    //     }
    // }

    // setBaselineAdjustment() {
    //     if (this.summaryDataIndex >= 11) {
    //         this.baselineAdjustment = this.baselineAdjustmentForNormalization + this.baselineAdjustmentForOtherV2;
    //     } else {
    //         this.baselineAdjustment = 0;
    //     }
    // }

    // setRollingSavingsValues(previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>, baselineOrBankedYear: boolean) {
    //     if (this.summaryDataIndex > 11 && !baselineOrBankedYear) {
    //         let last11MonthsData: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsValues.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
    //         let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
    //             return data.adjusted
    //         }) + this.adjusted;
    //         this.rollingSavings = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
    //             return data.savings
    //         }) + this.savings;

    //         this.rolling12MonthImprovement = this.rollingSavings / total12MonthsAdjusedBaseline;
    //     } else {
    //         this.rolling12MonthImprovement = 0;
    //         this.rollingSavings = 0;
    //     }
    // }

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
        // this.savingsBanked = new ConvertValue(this.savingsBanked, startingUnit, endingUnit).convertedValue;
        this.yearToDateSavings = new ConvertValue(this.yearToDateSavings, startingUnit, endingUnit).convertedValue;
        this.rollingSavings = new ConvertValue(this.rollingSavings, startingUnit, endingUnit).convertedValue;
    }
}