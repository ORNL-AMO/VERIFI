import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { BetterPlantsSummary, ReportOptions } from "src/app/models/overview-report";
import { AnnualAccountAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass";
import { AnnualFacilityAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass";
import { BetterPlantsEnergySummaryClass } from "./betterPlantsEnergySummaryClass";

export class BetterPlantsReportClass {

    facilityPerformance: Array<{ facility: IdbFacility, performance: number }>;
    reportYearAnalysisSummary: AnnualAnalysisSummary;
    baselineYearAnalysisSummary: AnnualAnalysisSummary;
    reportYearEnergySummaryClass: BetterPlantsEnergySummaryClass;
    baselineYearEnergySummaryClass: BetterPlantsEnergySummaryClass;
    adjustedBaselinePrimaryEnergy: number;
    totalEnergySavings: number;
    percentTotalImprovement: number;
    constructor(
        reportOptions: ReportOptions,
        selectedAnalysisItem: IdbAccountAnalysisItem,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        accountAnalysisItems: Array<IdbAnalysisItem>
    ) {
        this.setFacilityPerformance(selectedAnalysisItem, facilities, calanderizedMeters, accountPredictorEntries, accountAnalysisItems);
        this.setReportAndBaselineYearSummaries(selectedAnalysisItem, account, calanderizedMeters, facilities, accountPredictorEntries, accountAnalysisItems, reportOptions);
        this.setReportYearEnergySummaryClass(calanderizedMeters, reportOptions.targetYear);
        this.setBaselineYearEnergySummaryClass(calanderizedMeters, reportOptions.baselineYear);
        this.setAdjustBaselinePrimaryEnergy();
        this.setTotalEnergySavings();
        this.setPercentTotalImprovement();
    }

    setFacilityPerformance(
        selectedAnalysisItem: IdbAccountAnalysisItem,
        facilities: Array<IdbFacility>,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        accountAnalysisItems: Array<IdbAnalysisItem>) {

        this.facilityPerformance = new Array();
        selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
                let calanderizedFacilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(meter => { return meter.meter.facilityId == item.facilityId });
                let facility: IdbFacility = facilities.find(facility => { return facility.guid == item.facilityId });
                let facilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilityAnalysisItem, facility, calanderizedFacilityMeters, accountPredictorEntries, false);
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
        calanderizedMeters: Array<CalanderizedMeter>,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        reportOptions: ReportOptions) {
        let annualAccountAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(accountAnalysisItem, account, calanderizedMeters, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, false);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAccountAnalysisSummaryClass.getAnnualAnalysisSummaries();
        this.reportYearAnalysisSummary = annualAnalysisSummaries.find(summary => { return summary.year == reportOptions.targetYear });
        this.baselineYearAnalysisSummary = annualAnalysisSummaries.find(summary => { return summary.year == reportOptions.baselineYear });
    }

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

    setPercentTotalImprovement() {
        this.percentTotalImprovement = (this.totalEnergySavings / this.adjustedBaselinePrimaryEnergy) * 100
    }


    getBetterPlantsSummary(): BetterPlantsSummary {
        return {
            facilityPerformance: this.facilityPerformance,
            percentAnnualImprovement: this.reportYearAnalysisSummary.annualSavingsPercentImprovement,
            percentTotalImprovement: this.percentTotalImprovement,
            adjustedBaselinePrimaryEnergy: this.adjustedBaselinePrimaryEnergy,
            reportYearAnalysisSummary: this.reportYearAnalysisSummary,
            baselineYearAnalysisSummary: this.baselineYearAnalysisSummary,
            totalEnergySavings: this.totalEnergySavings,
            baselineYearResults: this.baselineYearEnergySummaryClass.getBetterPlantsEnergySummary(),
            reportYearResults: this.reportYearEnergySummaryClass.getBetterPlantsEnergySummary()
        }
    }
}