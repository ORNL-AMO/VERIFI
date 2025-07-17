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

    baselineAdjustmentForOtherV2: number;


    //new math vars
    rollingActual: number;
    rollingModeled: number;
    rollingActualBaseline: number;
    rollingModeledBaseline: number;
    rollingAdjusted: number;
    rollingBaselineAdjustmentForNormalization: number;
    rollingBaselineAdjustmentForOther: number;

    monthDataAdjustment: number;
    rollingDataAdjustment: number;
    rollingBaselineAdjustmentOther: number;

    //1964
    rollingChangeRatio: number;
    monthlyChangeRatio: number;
    fivePercentTarget: number;
    tenPercentTarget: number;
    fifteenPercentTarget: number;

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
        this.monthDataAdjustment = dataAdjustment;
        if (previousMonthValues.length > 10) {
            //step 1
            this.setRollingVals(previousMonthValues, dataAdjustment, baselineAdjustementInput);
            //step 2
            this.setAdjusted(modelYearDataAdjusted);
            //step 3
            this.setAdjustedSavings(lastBankedMonthSummaryData);
            //step 4
            this.setPercentSavings();
            //step 5
            this.setMonthlySavings(previousMonthValues);
            //step 6
            this.setMonthlyAdjustedBaseline(previousMonthValues);
            //step 7
            this.setAdjustmentForNormalization(modelYearDataAdjusted, previousMonthValues);
            //step 8
            this.setAdjustmentForOtherV3(modelYearDataAdjusted, previousMonthValues);
            //1964
            this.setRollingChangeRatio();
            this.setMonthlyChangeRatio();
            this.setFifteenPercentTarget();
            this.setTenPercentTarget();
            this.setFivePercentTarget();

        } else {
            this.setBaselineYearValues();
        }
        this.setBaselineAdjustment();
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
        this.rollingDataAdjustment = 0;
        this.rollingBaselineAdjustmentOther = 0;
        //1964
        this.rollingChangeRatio = 1;
        this.monthlyChangeRatio = 1;
        this.tenPercentTarget = 0;
        this.fivePercentTarget = 0;
        this.fifteenPercentTarget = 0;
    }

    //step 1
    setRollingVals(previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>, dataAdjustment: number, baselineAdjustementInput: number) {
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
        this.rollingDataAdjustment = _.sumBy(rollingValues, (val: GroupMonthlyAnalysisRollupValues) => {
            return val.monthDataAdjustment;
        }) + dataAdjustment;
        this.rollingBaselineAdjustmentOther = _.sumBy(rollingValues, (val: GroupMonthlyAnalysisRollupValues) => {
            return val.baselineAdjustmentForOtherV2;
        }) + baselineAdjustementInput;
    }

    //step 2: calculate the BP adjusted baseline
    setAdjusted(modelYearDataAdjusted: number) {
        this.rollingAdjusted = (this.rollingActualBaseline + this.rollingBaselineAdjustmentOther) * this.getAdjustmentRatio(modelYearDataAdjusted);
    }

    //step 3: calculate BP adjusted savings
    setAdjustedSavings(lastBankedMonthSummaryData: MonthlyAnalysisSummaryDataClass) {
        if (lastBankedMonthSummaryData) {
            this.rollingUnbankedSavings = (this.rollingAdjusted - this.rollingActual);
            this.rollingSavings = (1 + lastBankedMonthSummaryData.monthlyAnalysisRollingValues.rolling12MonthImprovement) * this.rollingAdjusted - this.rollingActual;
            this.rollingBankedSavings = this.rollingSavings - this.rollingUnbankedSavings;
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
                return data.savingsBanked;
            });
            let last11monthsUnbankedSavings: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.savingsUnbanked;
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
    setAdjustmentForNormalization(modelYearDataAdjusted: number, previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        this.rollingBaselineAdjustmentForNormalization = (this.rollingActualBaseline * this.getAdjustmentRatio(modelYearDataAdjusted)) - this.rollingActualBaseline;
        if (previousMonthsValues.length > 10) {
            let startIndex: number = previousMonthsValues.length - 11;
            let last11MonthsData: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsValues.slice(startIndex, previousMonthsValues.length);
            let last11monthsBaselineAdjustment: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.baselineAdjustmentForNormalization;
            })
            this.baselineAdjustmentForNormalization = this.rollingBaselineAdjustmentForNormalization - last11monthsBaselineAdjustment;
        } else {
            this.baselineAdjustmentForNormalization = this.rollingBaselineAdjustmentForNormalization;
        }
    }

    //step 8: calculate adjustment for operational changes
    setAdjustmentForOtherV3(modelYearDataAdjusted: number, previousMonthsValues: Array<GroupMonthlyAnalysisRollupValues>) {
        this.rollingBaselineAdjustmentForOther = this.rollingBaselineAdjustmentOther * this.getAdjustmentRatio(modelYearDataAdjusted);
        if (previousMonthsValues.length > 10) {
            let startIndex: number = previousMonthsValues.length - 11;
            let last11MonthsData: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsValues.slice(startIndex, previousMonthsValues.length);
            let last11monthsBaselineAdjustment: number = _.sumBy(last11MonthsData, (data: GroupMonthlyAnalysisRollupValues) => {
                return data.baselineAdjustmentForOtherV2;
            })
            this.baselineAdjustmentForOtherV2 = this.rollingBaselineAdjustmentOther - last11monthsBaselineAdjustment;
        } else {
            this.baselineAdjustmentForOtherV2 = this.rollingBaselineAdjustmentOther;
        }
    }

    getAdjustmentRatio(modelYearDataAdjusted: number): number {
        return ((this.rollingModeled - modelYearDataAdjusted) / (this.rollingModeledBaseline - modelYearDataAdjusted)) * (this.rollingActual / (this.rollingActual - this.rollingDataAdjustment));
    }

    setBaselineAdjustment() {
        this.baselineAdjustment = this.baselineAdjustmentForNormalization + this.baselineAdjustmentForOtherV2;
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

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

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
        this.savingsBanked = new ConvertValue(this.savingsBanked, startingUnit, endingUnit).convertedValue;
        this.savingsUnbanked = new ConvertValue(this.savingsUnbanked, startingUnit, endingUnit).convertedValue;
        this.yearToDateSavings = new ConvertValue(this.yearToDateSavings, startingUnit, endingUnit).convertedValue;
        this.rollingSavings = new ConvertValue(this.rollingSavings, startingUnit, endingUnit).convertedValue;

        this.fivePercentTarget = new ConvertValue(this.fivePercentTarget, startingUnit, endingUnit).convertedValue;
        this.tenPercentTarget = new ConvertValue(this.tenPercentTarget, startingUnit, endingUnit).convertedValue;
        this.fifteenPercentTarget = new ConvertValue(this.fifteenPercentTarget, startingUnit, endingUnit).convertedValue;
    }

    //1964
    setRollingChangeRatio() {
        this.rollingChangeRatio = (this.rollingModeled / this.rollingModeledBaseline)
    }
    setMonthlyChangeRatio() {
        this.monthlyChangeRatio = (this.modeledEnergy / this.baselineModeledEnergyUse);
    }
    setFivePercentTarget() {
        this.fivePercentTarget = this.rollingAdjusted * 0.95;
    }
    setTenPercentTarget() {
        this.tenPercentTarget = this.rollingAdjusted * 0.90;
    }
    setFifteenPercentTarget() {
        this.fifteenPercentTarget = this.rollingAdjusted * 0.85;
    }
}