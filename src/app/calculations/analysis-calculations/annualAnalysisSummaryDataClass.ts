
import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import * as _ from 'lodash';
import { IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { filterYearPredictorData } from "../shared-calculations/calculationsHelpers";

export class AnnualAnalysisSummaryDataClass {

    year: number;
    energyUse: number;
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
    previousYearPercentSavings: number;
    previousYearSavings: number;

    //adjustment corresponding to the model year
    modelYearDataAdjustment: number;
    //adjustment corresponding to the current year
    dataAdjustment: number;
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