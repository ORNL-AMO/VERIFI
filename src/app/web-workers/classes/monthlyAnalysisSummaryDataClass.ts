import { MonthlyData } from "src/app/models/calanderization";
import { AnalysisGroup, AnalysisType, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { HelperService } from "./helperService";
import { MonthlyGroupAnalysisClass } from "./monthlyGroupAnalysisClass";
import * as _ from 'lodash';

export class MonthlyAnalysisSummaryDataClass {
    //results
    date: Date;
    energyUse: number;
    modeledEnergy: number;
    adjustedForNormalization: number;
    adjusted: number;
    baselineAdjustmentForNormalization: number;
    baselineAdjustmentForOther: number;
    baselineAdjustment: number;
    predictorUsage: Array<{
        usage: number,
        predictorId: string
    }>;
    fiscalYear: number;
    group: AnalysisGroup;
    SEnPI: number;
    savings: number;
    percentSavingsComparedToBaseline: number;
    yearToDateSavings: number;
    yearToDatePercentSavings: number;
    rollingSavings: number;
    rolling12MonthImprovement: number;




    helperService: HelperService;
    monthPredictorData: Array<IdbPredictorEntry>;
    monthMeterData: Array<MonthlyData>;
    productionUsage: Array<number>;
    annualEnergyUse: number;
    yearToDateBaselineActualEnergyUse: number;
    yearToDateModeledEnergyUse: number;
    yearToDateActualEnergyUse: number;
    yearToDateBaselineModeledEnergyUse: number;
    yearToDateAdjustedEnergyUse: number;
    summaryDataIndex: number;
    baselineActualEnergyUse: number;
    baselineModeledEnergyUse: number;
    monthIndex: number;
    constructor(
        monthlyGroupAnalysisClass: MonthlyGroupAnalysisClass,
        monthDate: Date,
        previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>
    ) {
        this.helperService = new HelperService();
        this.date = monthDate;
        this.group = monthlyGroupAnalysisClass.selectedGroup;
        this.setFiscalYear(monthlyGroupAnalysisClass.facility);
        this.setMonthPredictorData(monthlyGroupAnalysisClass.facilityPredictorData);
        this.setMonthMeterData(monthlyGroupAnalysisClass.groupMonthlyData);
        this.initializeYearToDateValues(previousMonthsSummaryData);
        this.setEnergyUse();
        this.setPredictorAndProductionUsage(monthlyGroupAnalysisClass.predictorVariables);
        this.setBaselineActualEnergyUse(monthlyGroupAnalysisClass.baselineYear, previousMonthsSummaryData);
        this.setModeledEnergy(monthlyGroupAnalysisClass.selectedGroup.analysisType, monthlyGroupAnalysisClass.predictorVariables, monthlyGroupAnalysisClass.baselineYearEnergyIntensity)
        this.setBaselineModeledEnergyUse(monthlyGroupAnalysisClass.baselineYear, previousMonthsSummaryData);
        this.setAnnualEnergyUse(monthlyGroupAnalysisClass.annualMeterDataUsage);
        this.setBaselineAdjustmentForOther(monthlyGroupAnalysisClass.baselineYear);
        this.setAdjustedForNormalization();
        this.setAdjusted();
        this.setSEnPI();
        this.setSavings();
        this.setPercentSavingsComparedToBaseline();
        this.setYearToDateSavings(monthlyGroupAnalysisClass.baselineYear);
        this.setYearToDatePercentSavings();
        this.setBaselineAdjustmentForNormalization();
        this.setBaselineAdjustment();
        this.setRollingSavingsValues(previousMonthsSummaryData, monthlyGroupAnalysisClass.baselineYear);
    }

    setFiscalYear(facility: IdbFacility) {
        this.fiscalYear = this.helperService.getFiscalYear(new Date(this.date), facility);
    }

    setMonthPredictorData(facilityPredictorData: Array<IdbPredictorEntry>) {
        this.monthPredictorData = facilityPredictorData.filter(predictorData => {
            let predictorDate: Date = new Date(predictorData.date);
            return predictorDate.getUTCFullYear() == this.date.getUTCFullYear() && predictorDate.getUTCMonth() == this.date.getUTCMonth();
        });
    }

    setMonthMeterData(allMonthlyData: Array<MonthlyData>) {
        this.monthMeterData = allMonthlyData.filter(data => {
            let meterDataDate: Date = new Date(data.date);
            return meterDataDate.getUTCFullYear() == this.date.getUTCFullYear() && meterDataDate.getUTCMonth() == this.date.getUTCMonth();
        });
    }

    setEnergyUse() {
        this.energyUse = _.sumBy(this.monthMeterData, 'energyUse');
        this.yearToDateActualEnergyUse = this.yearToDateActualEnergyUse + this.energyUse;
    }

    setBaselineActualEnergyUse(baselineYear: number, previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineActualEnergyUse = this.energyUse;
        } else {
            this.baselineActualEnergyUse = previousMonthsSummaryData[this.monthIndex].energyUse;
        }
        this.yearToDateBaselineActualEnergyUse = this.yearToDateBaselineActualEnergyUse + this.baselineActualEnergyUse;
    }

    setBaselineModeledEnergyUse(baselineYear: number, previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineModeledEnergyUse = this.modeledEnergy;
        } else {
            this.baselineModeledEnergyUse = previousMonthsSummaryData[this.monthIndex].modeledEnergy;
        }
        this.yearToDateBaselineModeledEnergyUse = this.yearToDateBaselineModeledEnergyUse + this.baselineModeledEnergyUse;
    }

    setPredictorAndProductionUsage(predictorVariables: Array<PredictorData>) {
        this.predictorUsage = new Array();
        this.productionUsage = new Array();
        predictorVariables.forEach(variable => {
            let usageVal: number = 0;
            this.monthPredictorData.forEach(data => {
                let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
                usageVal = usageVal + predictorData.amount;
            });
            this.predictorUsage.push({
                usage: usageVal,
                predictorId: variable.id
            });
            if (variable.productionInAnalysis) {
                this.productionUsage.push(usageVal);
            }
        });
    }

    initializeYearToDateValues(previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.summaryDataIndex = previousMonthsSummaryData.length;
        if (this.summaryDataIndex == 0) {
            this.monthIndex = 0;
            this.yearToDateBaselineActualEnergyUse = 0;
            this.yearToDateModeledEnergyUse = 0;
            this.yearToDateActualEnergyUse = 0;
            this.yearToDateBaselineModeledEnergyUse = 0;
            this.yearToDateAdjustedEnergyUse = 0;
        } else {
            let previousMonthSummaryData: MonthlyAnalysisSummaryDataClass = previousMonthsSummaryData[this.summaryDataIndex - 1];
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


    setModeledEnergy(analysisType: AnalysisType, predictorVariables: Array<PredictorData>, baselineYearEnergyIntensity: number) {
        if (analysisType == 'regression') {
            this.modeledEnergy = this.calculateRegressionModeledEnergy(predictorVariables);
        } else if (analysisType == 'absoluteEnergyConsumption') {
            this.modeledEnergy = this.baselineActualEnergyUse;
        } else if (analysisType == 'energyIntensity') {
            this.modeledEnergy = this.calculateEnergyIntensityModeledEnergy(baselineYearEnergyIntensity);
        } else if (analysisType == 'modifiedEnergyIntensity') {
            this.modeledEnergy = this.calculateModifiedEnegyIntensityModeledEnergy(baselineYearEnergyIntensity);
        }

        if (this.modeledEnergy < 0) {
            this.modeledEnergy = 0;
        }
        this.yearToDateModeledEnergyUse = this.yearToDateModeledEnergyUse + this.modeledEnergy;
    }

    calculateRegressionModeledEnergy(predictorVariables: Array<PredictorData>): number {
        let modeledEnergy: number = 0;
        predictorVariables.forEach(variable => {
            let usageVal: number = 0;
            this.monthPredictorData.forEach(data => {
                let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
                usageVal = usageVal + predictorData.amount;
            });
            modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
        });
        modeledEnergy = modeledEnergy + this.group.regressionConstant;
        return modeledEnergy;
    }

    calculateEnergyIntensityModeledEnergy(baselineEnergyIntensity: number): number {
        let totalProductionUsage: number = _.sum(this.productionUsage);
        return baselineEnergyIntensity * totalProductionUsage;
    }

    calculateModifiedEnegyIntensityModeledEnergy(baselineYearEnergyIntensity: number): number {
        let totalProduction: number = _.sum(this.productionUsage);
        let baseLoad: number = this.group.averagePercentBaseload / 100;
        return baselineYearEnergyIntensity * totalProduction * (1 - baseLoad) + (this.baselineActualEnergyUse * baseLoad);
    }

    setAnnualEnergyUse(annualMeterDataUsage: Array<{ year: number, usage: number }>) {
        let findYearUsage: { year: number, usage: number } = annualMeterDataUsage.find(annualUsage => { return annualUsage.year == this.date.getUTCFullYear() });
        if (findYearUsage) {
            this.annualEnergyUse = 0;
        } else {
            this.annualEnergyUse = 0;
        }

    }

    setBaselineAdjustmentForOther(baselineYear: number) {
        this.baselineAdjustmentForOther = 0;
        if (this.group.hasBaselineAdjustement && this.fiscalYear != baselineYear) {
            let yearAdjustment: { year: number, amount: number } = this.group.baselineAdjustments.find(bAdjustement => { return bAdjustement.year == this.date.getUTCFullYear(); })
            if (yearAdjustment.amount) {
                this.baselineAdjustmentForOther = (this.energyUse / this.annualEnergyUse) * yearAdjustment.amount;
            }
        }
    }

    setAdjustedForNormalization() {
        this.adjustedForNormalization = this.modeledEnergy + this.baselineActualEnergyUse - this.baselineModeledEnergyUse;
    }

    setAdjusted() {
        this.adjusted = this.adjustedForNormalization + this.baselineAdjustmentForOther;
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

    setBaselineAdjustmentForNormalization() {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustmentForNormalization = this.adjustedForNormalization - this.baselineActualEnergyUse;
        } else {
            this.baselineAdjustmentForNormalization = 0;
        }
    }


    setBaselineAdjustment() {
        if (this.summaryDataIndex >= 11) {
            this.baselineAdjustment = this.baselineAdjustmentForNormalization + this.baselineAdjustmentForOther;
        } else {
            this.baselineAdjustment = 0;
        }
    }


    setRollingSavingsValues(previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>, baselineYear: number) {
        if (this.summaryDataIndex > 11) {
            let baselineMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass> = previousMonthsSummaryData.filter(dataItem => { return dataItem.fiscalYear == baselineYear });
            let totalBaselineModeledEnergy: number = _.sumBy(baselineMonthsSummaryData, 'modeledEnergy');
            let totalBaselineEnergy: number = _.sumBy(baselineMonthsSummaryData, 'energyUse');
            let last11MonthsData: Array<MonthlyAnalysisSummaryDataClass> = JSON.parse(JSON.stringify(previousMonthsSummaryData));
            last11MonthsData = last11MonthsData.splice(this.summaryDataIndex - 11, this.summaryDataIndex);
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