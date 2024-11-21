import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { BetterPlantsSummary } from "src/app/models/overview-report";
import { AnnualAccountAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass";
import { AnnualFacilityAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass";
import { BetterPlantsEnergySummaryClass } from "./betterPlantsEnergySummaryClass";
import { BetterPlantsWaterSummaryClass } from "./betterPlantsWaterSummaryClass";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import { getNeededUnits } from "../shared-calculations/calanderizationFunctions";
import { getIncludedMeters } from "../shared-calculations/calculationsHelpers";
import { ConvertValue } from "../conversions/convertValue";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";

export class BetterPlantsReportClass {

    facilityPerformance: Array<{ facility: IdbFacility, performance: number }>;
    reportYearAnalysisSummary: AnnualAnalysisSummary;
    baselineYearAnalysisSummary: AnnualAnalysisSummary;
    reportYearEnergySummaryClass: BetterPlantsEnergySummaryClass;
    baselineYearEnergySummaryClass: BetterPlantsEnergySummaryClass;
    reportYearWaterSummaryClass: BetterPlantsWaterSummaryClass;
    baselineYearWaterSummaryClass: BetterPlantsWaterSummaryClass;
    adjustedBaselinePrimaryEnergy: number;
    totalEnergySavings: number;
    totalBankedEnergySavings: number;
    percentTotalEnergyImprovement: number;
    totalWaterSavings: number;
    totalBankedWaterSavings: number;
    percentTotalWaterImprovement: number;
    adjustedBaselinePrimaryWater: number;
    reportYear: number;
    constructor(
        baselineYear: number,
        reportYear: number,
        selectedAnalysisItem: IdbAccountAnalysisItem,
        accountPredictorEntries: Array<IdbPredictorData>,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>
    ) {
        this.reportYear = reportYear;
        selectedAnalysisItem.reportYear = reportYear;
        this.setFacilityPerformance(selectedAnalysisItem, facilities, accountPredictorEntries, accountAnalysisItems, meters, meterData, accountPredictors);

        this.setReportAndBaselineYearSummaries(selectedAnalysisItem, account, facilities, accountPredictorEntries, accountAnalysisItems, baselineYear, reportYear, meters, meterData, accountPredictors);

        let neededUnits: 'MMBtu' | 'kgal' = 'MMBtu';
        if (selectedAnalysisItem.analysisCategory == 'water') {
            neededUnits = 'kgal';
        }

        let includedBaselineMeters: Array<IdbUtilityMeter> = getIncludedMeters(meters, selectedAnalysisItem, accountAnalysisItems, baselineYear);
        let calanderizedBaselineMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(includedBaselineMeters, meterData, account, false, { energyIsSource: selectedAnalysisItem.energyIsSource, neededUnits: neededUnits }, [], [], facilities);
        let includedReportMeters: Array<IdbUtilityMeter> = getIncludedMeters(meters, selectedAnalysisItem, accountAnalysisItems, reportYear);
        let calanderizedReportMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(includedReportMeters, meterData, account, false, { energyIsSource: selectedAnalysisItem.energyIsSource, neededUnits: neededUnits }, [], [], facilities);
        this.setReportYearEnergySummaryClass(calanderizedReportMeters, reportYear);
        this.setBaselineYearEnergySummaryClass(calanderizedBaselineMeters, baselineYear);
        this.setAdjustBaselinePrimaryEnergy();
        this.setTotalEnergySavings();
        this.setPercentTotalEnergyImprovement();

        this.setReportYearWaterSummaryClass(calanderizedReportMeters, reportYear, facilities, selectedAnalysisItem, accountAnalysisItems);
        this.setBaselineYearWaterSummaryClass(calanderizedBaselineMeters, baselineYear, facilities, selectedAnalysisItem, accountAnalysisItems);
        this.setAdjustBaselinePrimaryWater();
        this.setTotalWaterSavings();
        this.setPercentTotalWaterImprovement();
    }

    setFacilityPerformance(
        selectedAnalysisItem: IdbAccountAnalysisItem,
        facilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>) {

        this.facilityPerformance = new Array();
        selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
                let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.facilityId == item.facilityId });
                let facility: IdbFacility = facilities.find(facility => { return facility.guid == item.facilityId });
                let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, facility, false, { energyIsSource: facilityAnalysisItem.energyIsSource, neededUnits: getNeededUnits(facilityAnalysisItem) }, [], [], facilities);
                let facilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilityAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, accountAnalysisItems, false);
                let annualAnalysisSummary: Array<AnnualAnalysisSummary> = facilityAnalysisSummaryClass.getAnnualAnalysisSummaries();
                let reportYearSummary: AnnualAnalysisSummary = annualAnalysisSummary.find(summary => { return summary.year == selectedAnalysisItem.reportYear });
                if (reportYearSummary) {
                    this.facilityPerformance.push({
                        facility: facility,
                        performance: reportYearSummary.totalSavingsPercentImprovement
                    });
                }
            }
        })
    }

    setReportAndBaselineYearSummaries(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        baselineYear: number,
        reportYear: number,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>) {
        let annualAccountAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(accountAnalysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, false, meters, meterData, accountPredictors);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAccountAnalysisSummaryClass.getAnnualAnalysisSummaries();
        //report
        this.reportYearAnalysisSummary = annualAnalysisSummaries.find(summary => { return summary.year == reportYear });
        this.reportYearAnalysisSummary = this.convertAnnualAnalysisSummary(this.reportYearAnalysisSummary, accountAnalysisItem);
        //baseline
        this.baselineYearAnalysisSummary = annualAnalysisSummaries.find(summary => { return summary.year == baselineYear });
        this.baselineYearAnalysisSummary = this.convertAnnualAnalysisSummary(this.baselineYearAnalysisSummary, accountAnalysisItem);
    }

    //Energy
    setReportYearEnergySummaryClass(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.reportYearEnergySummaryClass = new BetterPlantsEnergySummaryClass(calanderizedMeters, year);
    }

    setBaselineYearEnergySummaryClass(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.baselineYearEnergySummaryClass = new BetterPlantsEnergySummaryClass(calanderizedMeters, year);
    }

    setAdjustBaselinePrimaryEnergy() {
        this.adjustedBaselinePrimaryEnergy = this.reportYearAnalysisSummary.baselineAdjustmentForOtherV2 + this.baselineYearEnergySummaryClass.totalEnergyUse + this.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
    }

    setTotalEnergySavings() {
        this.totalBankedEnergySavings = this.reportYearAnalysisSummary.savingsBanked;
        this.totalEnergySavings = (this.adjustedBaselinePrimaryEnergy - this.reportYearEnergySummaryClass.totalEnergyUse) + this.totalBankedEnergySavings;
    }

    setPercentTotalEnergyImprovement() {
        this.percentTotalEnergyImprovement = (this.totalEnergySavings / this.adjustedBaselinePrimaryEnergy) * 100
    }

    //water
    setReportYearWaterSummaryClass(calanderizedMeters: Array<CalanderizedMeter>, year: number, facilities: Array<IdbFacility>, selectedAnalysisItem: IdbAccountAnalysisItem, accountAnalysisItems: Array<IdbAnalysisItem>) {
        this.reportYearWaterSummaryClass = new BetterPlantsWaterSummaryClass(calanderizedMeters, year, facilities, selectedAnalysisItem, accountAnalysisItems);
    }

    setBaselineYearWaterSummaryClass(calanderizedMeters: Array<CalanderizedMeter>, year: number, facilities: Array<IdbFacility>, selectedAnalysisItem: IdbAccountAnalysisItem, accountAnalysisItems: Array<IdbAnalysisItem>) {
        this.baselineYearWaterSummaryClass = new BetterPlantsWaterSummaryClass(calanderizedMeters, year, facilities, selectedAnalysisItem, accountAnalysisItems);
    }

    setAdjustBaselinePrimaryWater() {
        this.adjustedBaselinePrimaryWater = this.reportYearAnalysisSummary.baselineAdjustmentForOtherV2 + this.baselineYearWaterSummaryClass.totalWaterIntake + this.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
    }

    setTotalWaterSavings() {
        this.totalBankedWaterSavings = this.reportYearAnalysisSummary.savingsBanked;
        this.totalWaterSavings = (this.adjustedBaselinePrimaryWater - this.reportYearWaterSummaryClass.totalWaterIntake) + this.totalBankedWaterSavings;
    }

    setPercentTotalWaterImprovement() {
        this.percentTotalWaterImprovement = (this.totalWaterSavings / this.adjustedBaselinePrimaryWater) * 100
    }

    getBetterPlantsSummary(): BetterPlantsSummary {
        return {
            reportYear: this.reportYear,
            facilityPerformance: this.facilityPerformance,
            percentAnnualImprovement: this.reportYearAnalysisSummary.annualSavingsPercentImprovement,
            percentTotalEnergyImprovement: this.percentTotalEnergyImprovement,
            percentTotalWaterImprovement: this.percentTotalWaterImprovement,
            adjustedBaselinePrimaryEnergy: this.adjustedBaselinePrimaryEnergy,
            adjustedBaselinePrimaryWater: this.adjustedBaselinePrimaryWater,
            reportYearAnalysisSummary: this.reportYearAnalysisSummary,
            baselineYearAnalysisSummary: this.baselineYearAnalysisSummary,
            totalEnergySavings: this.totalEnergySavings,
            totalWaterSavings: this.totalWaterSavings,
            baselineYearEnergyResults: this.baselineYearEnergySummaryClass.getBetterPlantsEnergySummary(),
            reportYearEnergyResults: this.reportYearEnergySummaryClass.getBetterPlantsEnergySummary(),
            baselineYearWaterResults: this.baselineYearWaterSummaryClass.getBetterPlantsWaterSummary(),
            reportYearWaterResults: this.reportYearWaterSummaryClass.getBetterPlantsWaterSummary(),
            totalEnergySavingsBanked: this.totalBankedEnergySavings,
            totalWaterSavingsBanked: this.totalBankedWaterSavings
        }
    }

    convertAnnualAnalysisSummary(summary: AnnualAnalysisSummary, analysisItem: IdbAccountAnalysisItem): AnnualAnalysisSummary {
        let startingUnit: string = analysisItem.energyUnit;
        let neededUnits: 'MMBtu' | 'kgal' = 'MMBtu';
        if (analysisItem.analysisCategory == 'water') {
            neededUnits = 'kgal';
            startingUnit = analysisItem.waterUnit;
        }
        summary.energyUse = new ConvertValue(summary.energyUse, startingUnit, neededUnits).convertedValue;
        summary.adjusted = new ConvertValue(summary.adjusted, startingUnit, neededUnits).convertedValue
        summary.baselineAdjustmentForNormalization = new ConvertValue(summary.baselineAdjustmentForNormalization, startingUnit, neededUnits).convertedValue
        summary.baselineAdjustmentForOtherV2 = new ConvertValue(summary.baselineAdjustmentForOtherV2, startingUnit, neededUnits).convertedValue
        summary.baselineAdjustment = new ConvertValue(summary.baselineAdjustment, startingUnit, neededUnits).convertedValue
        summary.savings = new ConvertValue(summary.savings, startingUnit, neededUnits).convertedValue
        summary.cummulativeSavings = new ConvertValue(summary.cummulativeSavings, startingUnit, neededUnits).convertedValue
        summary.newSavings = new ConvertValue(summary.newSavings, startingUnit, neededUnits).convertedValue
        return summary;
    }
}