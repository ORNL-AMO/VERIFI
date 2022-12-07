
import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import * as _ from 'lodash';
import { IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { filterYearPredictorData } from "../shared-calculations/calculationsHelpers";

export class AnnualAnalysisSummaryDataClass {

    year: number;
    energyUse: number;
    modeledEnergy: number;
    adjustedForNormalization: number;
    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustmentForOther: number;
    baselineAdjustment: number;
    SEnPI: number;
    savings: number;
    totalSavingsPercentImprovement: number;
    annualSavingsPercentImprovement: number;
    cummulativeSavings: number;
    newSavings: number;
    predictorUsage: Array<{
        usage: number;
        predictorId: string
    }>;


    yearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    baselineEnergyUse: number;
    baselineModeledEnergyUse: number;
    previousYearPercentSavings: number;
    previousYearSavings: number;
    constructor(
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        year: number,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        facility: IdbFacility,
        previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>
    ) {
        this.year = year;
        this.setYearAnalysisSummaryData(monthlyAnalysisSummaryData);
        this.setPredictorUsage(accountPredictorEntries, facility);
        this.setEnergyUse();
        this.setModeledEnergy();
        this.setBaselineEnergyUse(previousYearsSummaryData);
        this.setBaselineModeledEnergy(previousYearsSummaryData);
        this.setAdjustedForNormalization();
        this.setBaselineAdjustmentForOther();
        this.setBaselineAdjustmentForNormalization(previousYearsSummaryData);
        this.setBaselineAdjustment(previousYearsSummaryData);
        this.setAdjusted();
        this.setSEnPI();
        this.setSavings(previousYearsSummaryData);
        this.setTotalSavingsPercentImprovement();
        this.setPreviousYearSavings(previousYearsSummaryData);
        this.setAnnualSavingsPercentImprovement();
        this.setCummulativeSavings(previousYearsSummaryData);
        this.setNewSavings();
    }

    setYearAnalysisSummaryData(monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>) {
        this.yearAnalysisSummaryData = _.filter(monthlyAnalysisSummaryData, (data) => {
            return data.fiscalYear == this.year;
        });
    }

    setEnergyUse() {
        this.energyUse = _.sumBy(this.yearAnalysisSummaryData, 'energyUse');
    }

    setModeledEnergy() {
        this.modeledEnergy = _.sumBy(this.yearAnalysisSummaryData, 'modeledEnergy');
    }

    setBaselineEnergyUse(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.baselineEnergyUse = previousYearsSummaryData[0].baselineEnergyUse;
        } else {
            this.baselineEnergyUse = this.energyUse;
        }
    }

    setBaselineModeledEnergy(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.baselineModeledEnergyUse = previousYearsSummaryData[0].baselineModeledEnergyUse;
        } else {
            this.baselineModeledEnergyUse = this.modeledEnergy;
        }
    }

    setAdjustedForNormalization() {
        this.adjustedForNormalization = this.modeledEnergy + this.baselineEnergyUse - this.baselineModeledEnergyUse;
    }

    setBaselineAdjustmentForOther() {
        this.baselineAdjustmentForOther = _.sumBy(this.yearAnalysisSummaryData, 'baselineAdjustmentForOther')
    }

    setBaselineAdjustmentForNormalization(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.baselineAdjustmentForNormalization = this.adjustedForNormalization - this.baselineEnergyUse;
        } else {
            this.baselineAdjustmentForNormalization = 0;
        }
    }

    setBaselineAdjustment(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.baselineAdjustment = this.baselineAdjustmentForNormalization + this.baselineAdjustmentForOther;
        } else {
            this.baselineAdjustment = 0;
        }
    }

    setAdjusted() {
        this.adjusted = this.adjustedForNormalization + this.baselineAdjustmentForOther;
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.savings = this.adjusted - this.energyUse;
        } else {
            this.savings = 0;
        }
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
    }

    setCummulativeSavings(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            let previousYearData: AnnualAnalysisSummaryDataClass = previousYearsSummaryData.find(data => { return data.year == (this.year - 1) })
            this.cummulativeSavings = previousYearData.cummulativeSavings + this.savings;
        } else {
            this.cummulativeSavings = 0;
        }
    }

    setNewSavings() {
        this.newSavings = this.savings - this.previousYearSavings;
    }

    setPredictorUsage(accountPredictorEntries: Array<IdbPredictorEntry>, facility: IdbFacility) {
        this.predictorUsage = new Array();
        if (facility) {
            let facilityPredictorData: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == facility.guid });
            let summaryYearPredictorData: Array<IdbPredictorEntry> = filterYearPredictorData(facilityPredictorData, this.year, facility);
            if (summaryYearPredictorData.length > 0) {
                let predictorVariables: Array<PredictorData> = summaryYearPredictorData[0].predictors;
                predictorVariables.forEach(variable => {
                    let usageVal: number = 0;
                    summaryYearPredictorData.forEach(data => {
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
    }

}