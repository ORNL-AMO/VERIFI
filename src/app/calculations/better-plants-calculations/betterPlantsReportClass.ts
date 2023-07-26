import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { BetterPlantsSummary } from "src/app/models/overview-report";
import { AnnualAccountAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass";
import { AnnualFacilityAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass";
import { BetterPlantsEnergySummaryClass } from "./betterPlantsEnergySummaryClass";
import { BetterPlantsWaterSummaryClass } from "./betterPlantsWaterSummaryClass";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import { getNeededUnits } from "../shared-calculations/calanderizationFunctions";

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
    percentTotalEnergyImprovement: number;
    totalWaterSavings: number;
    percentTotalWaterImprovement: number;
    adjustedBaselinePrimaryWater: number;
    constructor(
        baselineYear: number,
        reportYear: number,
        selectedAnalysisItem: IdbAccountAnalysisItem,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>
    ) {
        this.setFacilityPerformance(selectedAnalysisItem, facilities, accountPredictorEntries, accountAnalysisItems, meters, meterData);
        let includedMeters: Array<IdbUtilityMeter> = this.getIncludedMeters(meters, selectedAnalysisItem, accountAnalysisItems);
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(includedMeters, meterData, account, false, { energyIsSource: selectedAnalysisItem.energyIsSource, neededUnits: getNeededUnits(selectedAnalysisItem) });
        this.setReportAndBaselineYearSummaries(selectedAnalysisItem, account, facilities, accountPredictorEntries, accountAnalysisItems, baselineYear, reportYear, meters, meterData);
        this.setReportYearEnergySummaryClass(calanderizedMeters, reportYear);
        this.setBaselineYearEnergySummaryClass(calanderizedMeters, baselineYear);
        this.setAdjustBaselinePrimaryEnergy();
        this.setTotalEnergySavings();
        this.setPercentTotalEnergyImprovement();

        this.setReportYearWaterSummaryClass(calanderizedMeters, reportYear, facilities, selectedAnalysisItem, accountAnalysisItems);
        this.setBaselineYearWaterSummaryClass(calanderizedMeters, baselineYear, facilities, selectedAnalysisItem, accountAnalysisItems);
        this.setAdjustBaselinePrimaryWater();
        this.setTotalWaterSavings();
        this.setPercentTotalWaterImprovement();
    }

    setFacilityPerformance(
        selectedAnalysisItem: IdbAccountAnalysisItem,
        facilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>) {

        this.facilityPerformance = new Array();
        selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
                let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.facilityId == item.facilityId });
                let facility: IdbFacility = facilities.find(facility => { return facility.guid == item.facilityId });
                let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, facility, false, { energyIsSource: facilityAnalysisItem.energyIsSource, neededUnits: getNeededUnits(facilityAnalysisItem) });
                let facilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilityAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, false);
                let annualAnalysisSummary: Array<AnnualAnalysisSummary> = facilityAnalysisSummaryClass.getAnnualAnalysisSummaries();
                let reportYearSummary: AnnualAnalysisSummary = annualAnalysisSummary.find(summary => { return summary.year == selectedAnalysisItem.reportYear });
                this.facilityPerformance.push({
                    facility: facility,
                    performance: reportYearSummary.totalSavingsPercentImprovement
                });
            }
        })
    }

    setReportAndBaselineYearSummaries(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        baselineYear: number,
        reportYear: number,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>) {
        let annualAccountAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(accountAnalysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, false, meters, meterData);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAccountAnalysisSummaryClass.getAnnualAnalysisSummaries();
        this.reportYearAnalysisSummary = annualAnalysisSummaries.find(summary => { return summary.year == reportYear });
        this.baselineYearAnalysisSummary = annualAnalysisSummaries.find(summary => { return summary.year == baselineYear });
    }

    //Energy
    setReportYearEnergySummaryClass(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.reportYearEnergySummaryClass = new BetterPlantsEnergySummaryClass(calanderizedMeters, year);
    }

    setBaselineYearEnergySummaryClass(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.baselineYearEnergySummaryClass = new BetterPlantsEnergySummaryClass(calanderizedMeters, year);
    }

    setAdjustBaselinePrimaryEnergy() {
        this.adjustedBaselinePrimaryEnergy = this.reportYearAnalysisSummary.baselineAdjustmentForOther + this.baselineYearEnergySummaryClass.totalEnergyUse + this.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
    }

    setTotalEnergySavings() {
        this.totalEnergySavings = this.adjustedBaselinePrimaryEnergy - this.reportYearEnergySummaryClass.totalEnergyUse;
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
        this.adjustedBaselinePrimaryWater = this.reportYearAnalysisSummary.baselineAdjustmentForOther + this.baselineYearWaterSummaryClass.totalWaterIntake + this.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
    }

    setTotalWaterSavings() {
        this.totalWaterSavings = this.adjustedBaselinePrimaryWater - this.reportYearWaterSummaryClass.totalWaterIntake;
    }

    setPercentTotalWaterImprovement() {
        this.percentTotalWaterImprovement = (this.totalWaterSavings / this.adjustedBaselinePrimaryWater) * 100
    }


    getBetterPlantsSummary(): BetterPlantsSummary {
        return {
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
            reportYearWaterResults: this.reportYearWaterSummaryClass.getBetterPlantsWaterSummary()
        }
    }

    getIncludedMeters(meters: Array<IdbUtilityMeter>, selectedAnalysisItem: IdbAccountAnalysisItem, accountAnalysisItems: Array<IdbAnalysisItem>) {
        let includedMeters: Array<IdbUtilityMeter> = new Array()
        selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
                facilityAnalysisItem.groups.forEach(group => {
                    if (group.analysisType != 'skip') {
                        let filteredMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
                            return meter.groupId == group.idbGroupId;
                        });
                        includedMeters = includedMeters.concat(filteredMeters);
                    }
                });
            }
        });
        return includedMeters;
    }
}