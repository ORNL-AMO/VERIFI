import { MonthlyData } from "src/app/models/calanderization";
import { MonthlyGroupAnalysisClass } from "./monthlyGroupAnalysisClass";
import * as _ from 'lodash';
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";
import { AnalysisCategory, AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisType } from "src/app/models/analysis";
import { ConvertValue } from "../conversions/convertValue";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { GroupMonthlyAnalysisRollupValues } from './groupMonthlyAnalysisRollupValuesClass';

export class MonthlyAnalysisSummaryDataClass {
    //results
    date: Date;
    energyUse: number;
    modeledEnergy: number;
    baselineAdjustmentInput: number;
    baselineAdjustmentInputYearTotal: number;

    dataAdjustment: number;
    dataAdjustmentCurrentYear: number;

    modelYearDataAdjustment: number;
    modelYearDataAdjustmentYearTotal: number;

    predictorUsage: Array<{
        usage: number,
        predictorId: string
    }>;
    fiscalYear: number;
    group: AnalysisGroup;
    // monthlyAnalysisCalculatedValues: GroupMonthlyAnalysisCalculatedValues;
    monthlyAnalysisRollingValues: GroupMonthlyAnalysisRollupValues;

    //used for calcs
    monthPredictorData: Array<IdbPredictorData>;
    monthMeterData: Array<MonthlyData>;
    productionUsage: Array<number>;
    annualEnergyUse: number;
    baselineActualEnergyUse: number;
    monthIndex: number;
    isNew: boolean;
    isBaselineYear: boolean;
    isBankedAnalysis: boolean;
    baselineYear: number;
    bankedAnalysisYear: number;
    originalBaselineYearBaselineActualEnergyUse: number;
    constructor(
        monthlyGroupAnalysisClass: MonthlyGroupAnalysisClass,
        monthDate: Date,
        previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>,
        facility: IdbFacility,
        lastBankedMonthlyAnalysis: MonthlyAnalysisSummaryDataClass,
        baselineActualSummaryData: Array<MonthlyAnalysisSummaryDataClass>
    ) {
        this.date = monthDate;
        this.group = monthlyGroupAnalysisClass.selectedGroup;
        this.isNew = facility.isNewFacility;
        this.baselineYear = monthlyGroupAnalysisClass.baselineYear;
        this.bankedAnalysisYear = monthlyGroupAnalysisClass.bankedAnalysisYear;
        this.setFiscalYear(monthlyGroupAnalysisClass.facility);
        this.setIsBaselineYear(monthlyGroupAnalysisClass.baselineYear);
        this.setIsBankedAnalysis();
        this.setMonthPredictorData(monthlyGroupAnalysisClass.facilityPredictorData);
        this.setMonthMeterData(monthlyGroupAnalysisClass.groupMonthlyData);
        this.setMonthIndex(previousMonthsSummaryData);
        this.setEnergyUse(monthlyGroupAnalysisClass.analysisItem.analysisCategory);
        this.setPredictorAndProductionUsage(monthlyGroupAnalysisClass.selectedGroup.predictorVariables);
        this.setBaselineActualEnergyUse(previousMonthsSummaryData, baselineActualSummaryData);
        this.setModeledEnergy(monthlyGroupAnalysisClass.selectedGroup.analysisType, monthlyGroupAnalysisClass.predictorVariables, monthlyGroupAnalysisClass.baselineYearEnergyIntensity);
        this.setAnnualEnergyUse(monthlyGroupAnalysisClass.annualMeterDataUsage);
        this.setBaselineAdjustmentInput();
        this.setModelYearDataAdjustment(monthlyGroupAnalysisClass.modelYear);
        this.setDataAdjustment();
        this.setMonthlyAnalysisCalculatedValues(previousMonthsSummaryData, lastBankedMonthlyAnalysis);
    }

    setFiscalYear(facility: IdbFacility) {
        this.fiscalYear = getFiscalYear(new Date(this.date), facility);
    }

    setIsBaselineYear(baselineYear: number) {
        this.isBaselineYear = (baselineYear == this.fiscalYear);
    }

    setIsBankedAnalysis() {
        if (this.bankedAnalysisYear) {
            this.isBankedAnalysis = (this.fiscalYear < this.baselineYear);
        } else {
            this.isBankedAnalysis = false;
        }
    }

    setMonthPredictorData(facilityPredictorData: Array<IdbPredictorData>) {
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

    setEnergyUse(analysisCategory: AnalysisCategory) {
        if (analysisCategory == 'energy') {
            this.energyUse = _.sumBy(this.monthMeterData, (data: MonthlyData) => { return data.energyUse });
        } else if (analysisCategory == 'water') {
            this.energyUse = _.sumBy(this.monthMeterData, (data: MonthlyData) => { return data.energyConsumption });
        }
    }

    setBaselineActualEnergyUse(previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>, baselineActualSummaryData: Array<MonthlyAnalysisSummaryDataClass>) {
        if (baselineActualSummaryData) {
            this.originalBaselineYearBaselineActualEnergyUse = baselineActualSummaryData[this.monthIndex].energyUse;
        }
        if (this.isBaselineYear || this.isBankedAnalysis) {
            this.baselineActualEnergyUse = this.energyUse;
        } else {
            this.baselineActualEnergyUse = previousMonthsSummaryData[this.monthIndex].energyUse;
        }
    }

    setPredictorAndProductionUsage(predictorVariables: Array<AnalysisGroupPredictorVariable>) {
        this.predictorUsage = new Array();
        this.productionUsage = new Array();
        predictorVariables.forEach(variable => {
            let usageVal: number = 0;
            this.monthPredictorData.forEach(data => {
                if (data.predictorId == variable.id) {
                    usageVal = usageVal + data.amount;
                }
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

    setModeledEnergy(analysisType: AnalysisType, predictorVariables: Array<AnalysisGroupPredictorVariable>, baselineYearEnergyIntensity: number) {
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

    calculateRegressionModeledEnergy(predictorVariables: Array<AnalysisGroupPredictorVariable>): number {
        let modeledEnergy: number = 0;
        predictorVariables.forEach(variable => {
            let usageVal: number = 0;
            this.monthPredictorData.forEach(data => {
                if (data.predictorId == variable.id) {
                    usageVal = usageVal + data.amount;
                }
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
        let findYearUsage: { year: number, usage: number } = annualMeterDataUsage.find(annualUsage => { return annualUsage.year == this.fiscalYear });
        if (findYearUsage) {
            this.annualEnergyUse = findYearUsage.usage;
        } else {
            this.annualEnergyUse = 0;
        }

    }

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = 0;
        this.baselineAdjustmentInputYearTotal = 0;
        if (this.group.hasBaselineAdjustmentV2) {
            let yearAdjustment: { year: number, amount: number } = this.group.baselineAdjustmentsV2.find(bAdjustement => { return bAdjustement.year == this.fiscalYear; })
            if (yearAdjustment && yearAdjustment.amount) {
                this.baselineAdjustmentInput = (this.energyUse / this.annualEnergyUse) * yearAdjustment.amount;
                this.baselineAdjustmentInputYearTotal = yearAdjustment.amount;
            }
        }
    }


    setModelYearDataAdjustment(modelYear: number) {
        this.modelYearDataAdjustment = 0;
        this.modelYearDataAdjustmentYearTotal = 0;
        if (this.group.hasDataAdjustement) {
            let yearAdjustment: { year: number, amount: number } = this.group.dataAdjustments.find(bAdjustement => { return bAdjustement.year == modelYear; })
            if (yearAdjustment && yearAdjustment.amount) {
                this.modelYearDataAdjustment = (this.energyUse / this.annualEnergyUse) * yearAdjustment.amount;
                this.modelYearDataAdjustmentYearTotal = yearAdjustment.amount;
            }
        }
    }

    setDataAdjustment() {
        this.dataAdjustment = 0;
        this.dataAdjustmentCurrentYear = 0;
        if (this.group.hasDataAdjustement) {
            let yearAdjustment: { year: number, amount: number } = this.group.dataAdjustments.find(bAdjustement => { return bAdjustement.year == this.fiscalYear; })
            if (yearAdjustment && yearAdjustment.amount) {
                this.dataAdjustmentCurrentYear = yearAdjustment.amount;
                this.dataAdjustment = (this.energyUse / this.annualEnergyUse) * yearAdjustment.amount;
            }
        }
    }


    setMonthlyAnalysisCalculatedValues(previousMonthsSummaryData: Array<MonthlyAnalysisSummaryDataClass>,
        lastBankedMonthlyAnalysis: MonthlyAnalysisSummaryDataClass) {
        // let previousMonthsAnalysisCalculatedValues: Array<GroupMonthlyAnalysisCalculatedValues> = previousMonthsSummaryData.map(data => { return data.monthlyAnalysisCalculatedValues });
        let previousMonthsAnalysisRollingValues: Array<GroupMonthlyAnalysisRollupValues> = previousMonthsSummaryData.map(data => { return data.monthlyAnalysisRollingValues });
        let baselineOrBankedYear: boolean = (this.isBaselineYear || this.isBankedAnalysis);
        // this.monthlyAnalysisCalculatedValues = new GroupMonthlyAnalysisCalculatedValues(
        //     this.energyUse,
        //     this.modeledEnergy,
        //     this.baselineAdjustmentInput,
        //     this.fiscalYear,
        //     baselineOrBankedYear,
        //     previousMonthsAnalysisCalculatedValues,
        //     this.baselineActualEnergyUse,
        //     this.modelYearDataAdjustment,
        //     this.dataAdjustment,
        //     lastBankedMonthlyAnalysis,
        //     this.originalBaselineYearBaselineActualEnergyUse
        // );

        this.monthlyAnalysisRollingValues = new GroupMonthlyAnalysisRollupValues(
            this.energyUse,
            this.modeledEnergy,
            this.baselineAdjustmentInputYearTotal,
            this.fiscalYear,
            baselineOrBankedYear,
            previousMonthsAnalysisRollingValues,
            this.baselineActualEnergyUse,
            this.modelYearDataAdjustmentYearTotal,
            this.dataAdjustmentCurrentYear,
            lastBankedMonthlyAnalysis,
            this.originalBaselineYearBaselineActualEnergyUse,

        );

    }

    convertResults(startingUnit: string, endingUnit: string) {
        this.energyUse = new ConvertValue(this.energyUse, startingUnit, endingUnit).convertedValue;
        this.modeledEnergy = new ConvertValue(this.modeledEnergy, startingUnit, endingUnit).convertedValue;
        this.baselineAdjustmentInput = new ConvertValue(this.baselineAdjustmentInput, startingUnit, endingUnit).convertedValue;
        // this.monthlyAnalysisCalculatedValues.convertResults(startingUnit, endingUnit);
        this.monthlyAnalysisRollingValues.convertResults(startingUnit, endingUnit);
    }
}


