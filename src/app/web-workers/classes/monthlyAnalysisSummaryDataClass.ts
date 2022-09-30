import { MonthlyData } from "src/app/models/calanderization";
import { AnalysisGroup, AnalysisType, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { HelperService } from "./helperService";
import { MonthlyGroupAnalysisClass } from "./monthlyGroupAnalysisClass";
import * as _ from 'lodash';
import { MonthlyAnalysisCalculatedValues } from "./monthlyAnalysisCalculatedValuesClass";

export class MonthlyAnalysisSummaryDataClass {
    //results
    date: Date;
    energyUse: number;
    modeledEnergy: number;
    baselineAdjustmentForOther: number;
    predictorUsage: Array<{
        usage: number,
        predictorId: string
    }>;
    fiscalYear: number;
    group: AnalysisGroup;
    monthlyAnalysisCalculatedValues: MonthlyAnalysisCalculatedValues;

    //used for calcs
    helperService: HelperService;
    monthPredictorData: Array<IdbPredictorEntry>;
    monthMeterData: Array<MonthlyData>;
    productionUsage: Array<number>;
    annualEnergyUse: number;
    baselineActualEnergyUse: number;
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
        this.setMonthIndex(previousMonthsSummaryData);
        this.setEnergyUse();
        this.setPredictorAndProductionUsage(monthlyGroupAnalysisClass.predictorVariables);
        this.setBaselineActualEnergyUse(monthlyGroupAnalysisClass.baselineYear, previousMonthsSummaryData);
        this.setModeledEnergy(monthlyGroupAnalysisClass.selectedGroup.analysisType, monthlyGroupAnalysisClass.predictorVariables, monthlyGroupAnalysisClass.baselineYearEnergyIntensity);
        this.setAnnualEnergyUse(monthlyGroupAnalysisClass.annualMeterDataUsage);
        this.setBaselineAdjustmentForOther(monthlyGroupAnalysisClass.baselineYear);
        this.setMonthlyAnalysisCalculatedValues(monthlyGroupAnalysisClass.baselineYear, previousMonthsSummaryData);
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
    }

    setBaselineActualEnergyUse(baselineYear: number, previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineActualEnergyUse = this.energyUse;
        } else {
            this.baselineActualEnergyUse = previousMonthsSummaryData[this.monthIndex].energyUse;
        }
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

    setMonthIndex(previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        let summaryDataIndex: number = previousMonthsSummaryData.length;
        if (summaryDataIndex == 0) {
            this.monthIndex = 0;
        } else {
            let previousMonthSummaryData: MonthlyAnalysisSummaryDataClass = previousMonthsSummaryData[summaryDataIndex - 1];
            if (previousMonthSummaryData.fiscalYear == this.fiscalYear) {
                this.monthIndex = previousMonthSummaryData.monthIndex + 1;
            } else {
                this.monthIndex = 0;
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
            this.annualEnergyUse = findYearUsage.usage;
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

    setMonthlyAnalysisCalculatedValues(baselineYear: number, previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        let previousMonthsAnalysisCalculatedValues: Array<MonthlyAnalysisCalculatedValues> = previousMonthsSummaryData.map(data => { return data.monthlyAnalysisCalculatedValues });
        this.monthlyAnalysisCalculatedValues = new MonthlyAnalysisCalculatedValues(
            this.energyUse,
            this.modeledEnergy,
            this.baselineAdjustmentForOther,
            this.fiscalYear,
            baselineYear,
            previousMonthsAnalysisCalculatedValues,
            this.baselineActualEnergyUse
        );
    }
}


