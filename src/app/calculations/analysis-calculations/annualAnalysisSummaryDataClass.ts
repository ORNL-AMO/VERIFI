
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import * as _ from 'lodash';
import { checkAnalysisValue, filterYearPredictorData } from "../shared-calculations/calculationsHelpers";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";

export class AnnualAnalysisSummaryDataClass {

    year: number;
    energyUse: number;
    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustmentForOtherV2: number;
    baselineAdjustment: number;
    SEnPI: number;
    savings: number;
    savingsBanked: number;
    totalSavingsPercentImprovement: number;
    annualSavingsPercentImprovement: number;
    cummulativeSavings: number;
    newSavings: number;
    predictorUsage: Array<{
        usage: number;
        predictorId: string
    }>;


    yearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    previousYearPercentSavings: number;
    previousYearSavings: number;

    //adjustment corresponding to the model year
    modelYearDataAdjustment: number;
    //adjustment corresponding to the current year
    dataAdjustment: number;
    baselineAdjustmentInput: number;
    isBanked: boolean;
    isIntermediateBanked: boolean;
    constructor(
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        year: number,
        accountPredictorEntries: Array<IdbPredictorData>,
        facility: IdbFacility,
        previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>,
        accountPredictors: Array<IdbPredictor>
    ) {
        this.year = year;
        this.setYearAnalysisSummaryData(monthlyAnalysisSummaryData);
        this.setIsBanked();
        this.setIsIntermediate();
        this.setPredictorUsage(accountPredictorEntries, facility, accountPredictors);
        this.setEnergyUse();
        this.setBaselineAdjustmentInput()
        this.setModelYearDataAdjustment();
        this.setDataAdjustment();
        this.setAdjusted();
        this.setBaselineAdjustmentForOtherV2();
        this.setBaselineAdjustmentForNormalization();
        this.setBaselineAdjustment();
        this.setSEnPI();
        this.setSavings();
        this.setTotalSavingsPercentImprovement();
        this.setPreviousYearSavings(previousYearsSummaryData);
        this.setAnnualSavingsPercentImprovement();
        this.setCummulativeSavings(previousYearsSummaryData);
        this.setNewSavings();
    }

    setYearAnalysisSummaryData(monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>) {
        this.yearAnalysisSummaryData = _.filter(monthlyAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.fiscalYear == this.year;
        });
    }

    setIsBanked() {
        this.isBanked = this.yearAnalysisSummaryData.find(data => {
            return data.isBanked;
        }) != undefined;
    }

    setIsIntermediate() {
        this.isIntermediateBanked = this.yearAnalysisSummaryData.find(data => {
            return data.isIntermediateBanked;
        }) != undefined;
    }

    setEnergyUse() {
        this.energyUse = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.energyUse;
        });
    }

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.baselineAdjustmentInput;
        })
    }

    setBaselineAdjustmentForOtherV2() {
        this.baselineAdjustmentForOtherV2 = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.baselineAdjustmentForOtherV2;
        });
    }

    setModelYearDataAdjustment() {
        this.modelYearDataAdjustment = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.modelYearDataAdjustment;
        });
    }

    setDataAdjustment() {
        this.dataAdjustment = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.dataAdjustment;
        });
    }

    setBaselineAdjustmentForNormalization() {
        this.baselineAdjustmentForNormalization = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.baselineAdjustmentForNormalization;
        });
    }

    setBaselineAdjustment() {
        this.baselineAdjustment = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.baselineAdjustment;
        });
    }

    setAdjusted() {
        this.adjusted = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.adjusted;
        });
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings() {
        this.savings = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.savings;
        });
        this.savingsBanked = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.savingsBanked;
        });
    }

    setTotalSavingsPercentImprovement() {
        this.totalSavingsPercentImprovement = this.savings / this.adjusted;
    }

    setPreviousYearSavings(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            let previousYearData: AnnualAnalysisSummaryDataClass = previousYearsSummaryData.find(data => { return data.year == (this.year - 1) })
            this.previousYearSavings = previousYearData.savings;
            this.previousYearPercentSavings = previousYearData.totalSavingsPercentImprovement;
        } else {
            this.previousYearSavings = 0;
            this.previousYearPercentSavings = 0;
        }
    }

    setAnnualSavingsPercentImprovement() {
        this.annualSavingsPercentImprovement = this.totalSavingsPercentImprovement - this.previousYearPercentSavings;
        if (this.isIntermediateBanked) {
            this.annualSavingsPercentImprovement = 0;
        }
    }

    setCummulativeSavings(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0 && !this.isIntermediateBanked) {
            let previousYearData: Array<AnnualAnalysisSummaryDataClass> = previousYearsSummaryData.filter(data => { return data.year < this.year })
            let sumSavings: number = _.sumBy(previousYearData, (data: AnnualAnalysisSummaryDataClass) => { return data.cummulativeSavings });
            this.cummulativeSavings = sumSavings + this.savings;
        } else {
            this.cummulativeSavings = 0;
        }
    }

    setNewSavings() {
        this.newSavings = this.savings - this.previousYearSavings;
        if (this.isIntermediateBanked) {
            this.newSavings = 0;
        }
    }

    setPredictorUsage(accountPredictorEntries: Array<IdbPredictorData>, facility: IdbFacility, accountPredictors: Array<IdbPredictor>) {
        this.predictorUsage = new Array();
        if (facility) {
            let facilityPredictorData: Array<IdbPredictorData> = accountPredictorEntries.filter(entry => { return entry.facilityId == facility.guid });
            let summaryYearPredictorData: Array<IdbPredictorData> = filterYearPredictorData(facilityPredictorData, this.year, facility);
            if (summaryYearPredictorData.length > 0) {
                // let predictorVariables: Array<PredictorData> = summaryYearPredictorData[0].predictors;
                accountPredictors.forEach(variable => {
                    let predictorData: Array<IdbPredictorData> = summaryYearPredictorData.filter(pData => {
                        return pData.predictorId == variable.guid
                    });
                    let usageVal: number = _.sumBy(predictorData, (pData: IdbPredictorData) => {
                        return pData.amount;
                    });
                    this.predictorUsage.push({
                        usage: usageVal,
                        predictorId: variable.guid
                    });
                });
            }
        }
    }

    getFormattedResult(): AnnualAnalysisSummary {
        return {
            year: this.year,
            energyUse: this.energyUse,
            adjusted: this.adjusted,
            baselineAdjustmentForNormalization: checkAnalysisValue(this.baselineAdjustmentForNormalization),
            baselineAdjustmentForOtherV2: checkAnalysisValue(this.baselineAdjustmentForOtherV2),
            baselineAdjustment: checkAnalysisValue(this.baselineAdjustment),
            SEnPI: checkAnalysisValue(this.SEnPI),
            savings: checkAnalysisValue(this.savings),
            totalSavingsPercentImprovement: checkAnalysisValue(this.totalSavingsPercentImprovement) * 100,
            annualSavingsPercentImprovement: checkAnalysisValue(this.annualSavingsPercentImprovement) * 100,
            cummulativeSavings: checkAnalysisValue(this.cummulativeSavings),
            newSavings: checkAnalysisValue(this.newSavings),
            predictorUsage: this.predictorUsage,
            isBanked: this.isBanked,
            isIntermediateBanked: this.isIntermediateBanked,
            savingsBanked: checkAnalysisValue(this.savingsBanked)
        }
    }


}