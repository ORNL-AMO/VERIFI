
import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import * as _ from 'lodash';
import { IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { filterYearPredictorData } from "../shared-calculations/calculationsHelpers";

export class AnnualAnalysisSummaryDataClass {

    year: number;
    energyUse: number;
    modeledEnergy: number;
    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustmentForOtherV2: number;
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

    adjustedStar: number;
    adjustedStarStar: number;
    //adjustment corresponding to the model year
    modelYearDataAdjustment: number;
    //adjustment corresponding to the current year
    dataAdjustment: number;
    adjustmentForOther: number;
    baselineAdjustmentInput: number;
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
        this.setBaselineAdjustmentInput()
        this.setModelYearDataAdjustment();
        this.setDataAdjustment();
        this.setAdjustedStar();
        this.setAdjustedStarStar();
        this.setAdjusted();
        this.setAdjustmentForOther();
        this.setBaselineAdjustmentForOtherV2();
        this.setBaselineAdjustmentForNormalization(previousYearsSummaryData);
        this.setBaselineAdjustment(previousYearsSummaryData);
        this.setSEnPI();
        this.setSavings(previousYearsSummaryData);
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

    setEnergyUse() {
        this.energyUse = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.energyUse;
        });
    }

    setModeledEnergy() {
        this.modeledEnergy = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.modeledEnergy;
        });
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

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
            return data.baselineAdjustmentInput;
        })
    }

    setBaselineAdjustmentForOtherV2() {
        this.baselineAdjustmentForOtherV2 = this.adjustedStarStar - this.adjustedStar;
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

    setBaselineAdjustmentForNormalization(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.baselineAdjustmentForNormalization = this.adjustedStar - (this.baselineEnergyUse + this.baselineAdjustmentInput);
        } else {
            this.baselineAdjustmentForNormalization = 0;
        }
    }

    setBaselineAdjustment(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.baselineAdjustment = this.baselineAdjustmentForNormalization + this.baselineAdjustmentForOtherV2;
        } else {
            this.baselineAdjustment = 0;
        }
    }

    setAdjustedStar() {
        this.adjustedStar = (this.baselineEnergyUse + this.baselineAdjustmentInput) * ((this.modeledEnergy - this.modelYearDataAdjustment) / (this.baselineModeledEnergyUse - this.modelYearDataAdjustment));

    }

    setAdjustedStarStar() {
        this.adjustedStarStar = this.adjustedStar * (this.energyUse / (this.energyUse - this.dataAdjustment));
    }

    setAdjusted() {
        this.adjusted = this.adjustedStarStar;
    }

    setAdjustmentForOther() {
        this.adjustmentForOther = this.adjustedStarStar - this.adjustedStar;
    }

    setSEnPI() {
        this.SEnPI = this.energyUse / this.adjusted;
    }

    setSavings(previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass>) {
        if (previousYearsSummaryData.length != 0) {
            this.savings = _.sumBy(this.yearAnalysisSummaryData, (data: MonthlyAnalysisSummaryData) => {
                return data.savings;
            });
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