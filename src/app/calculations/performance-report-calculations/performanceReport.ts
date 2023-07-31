import { CalanderizedMeter } from "src/app/models/calanderization";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getNeededUnits } from "../shared-calculations/calanderizationFunctions";
import { AnnualFacilityAnalysisSummaryClass } from "../analysis-calculations/annualFacilityAnalysisSummaryClass";
import { AnnualAnalysisSummary } from "src/app/models/analysis";
import * as _ from 'lodash';

export class PerformanceReport {

    reportYear: number;
    annualFacilityAnalysisSummaries: Array<{
        facility: IdbFacility,
        annualAnalysisSummary: Array<AnnualAnalysisSummary>
    }>;
    annualFacilityData: Array<{
        facility: IdbFacility,
        annualData: Array<{
            adjusted: number,
            savings: number,
            contribution,
            year: number,
            changeInContribution: number,
            changeInAdjustedBaseline: number
        }>,
    }>;
    constructor(
        baselineYear: number,
        reportYear: number,
        selectedAnalysisItem: IdbAccountAnalysisItem,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>) {
        this.setAnnualFacilityAnalysisSummaries(selectedAnalysisItem, facilities, accountPredictorEntries, accountAnalysisItems, meters, meterData);
        this.setAnnualFacilityData(baselineYear, reportYear);
    }

    setAnnualFacilityAnalysisSummaries(
        selectedAnalysisItem: IdbAccountAnalysisItem,
        facilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>) {
        this.annualFacilityAnalysisSummaries = new Array();
        selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
                let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.facilityId == item.facilityId });
                let facility: IdbFacility = facilities.find(facility => { return facility.guid == item.facilityId });
                let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, facility, false, { energyIsSource: facilityAnalysisItem.energyIsSource, neededUnits: getNeededUnits(facilityAnalysisItem) });
                let facilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilityAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, false);
                let annualAnalysisSummary: Array<AnnualAnalysisSummary> = facilityAnalysisSummaryClass.getAnnualAnalysisSummaries();
                this.annualFacilityAnalysisSummaries.push({
                    facility: facility,
                    annualAnalysisSummary: annualAnalysisSummary
                })
            }
        })

    }


    setAnnualFacilityData(baselineYear: number, reportYear: number) {
        this.annualFacilityData = new Array();
        let allAnnualSummaries: Array<AnnualAnalysisSummary> = this.annualFacilityAnalysisSummaries.flatMap(facilitySummary => {
            return facilitySummary.annualAnalysisSummary;
        });
        this.annualFacilityAnalysisSummaries.forEach(facilitySummary => {
            let annualData: Array<{
                adjusted: number,
                savings: number,
                contribution,
                year: number,
                changeInAdjustedBaseline: number,
                changeInContribution: number
            }> = new Array();
            let startYear: number = baselineYear;
            let previousYearContribution: number = 0;
            let baselineYearAdjusted: number = 0;
            while (startYear <= reportYear) {
                let yearSummaryData: Array<AnnualAnalysisSummary> = allAnnualSummaries.filter(summary => {
                    return summary.year == startYear
                });
                let totalAdjusted: number = _.sumBy(yearSummaryData, (data: AnnualAnalysisSummary) => {
                    return data.adjusted;
                });
                let facilityYearSummary: AnnualAnalysisSummary = facilitySummary.annualAnalysisSummary.find(annualSummary => {
                    return annualSummary.year == startYear;
                });
                let changeInAdjustedBaseline: number = 0;
                let changeInContribution: number = 0;
                let contribution: number = (facilityYearSummary.adjusted * facilityYearSummary.totalSavingsPercentImprovement) / totalAdjusted;
                if (startYear == baselineYear) {
                    baselineYearAdjusted = facilityYearSummary.adjusted;
                }
                changeInAdjustedBaseline = (facilityYearSummary.adjusted - baselineYearAdjusted) / baselineYearAdjusted;
                if (startYear != baselineYear && startYear != (baselineYear + 1)) {
                    changeInContribution = (contribution - previousYearContribution);
                } else if (startYear == (baselineYear + 1)) {
                    changeInContribution = contribution;
                }
                annualData.push({
                    adjusted: facilityYearSummary.adjusted,
                    savings: facilityYearSummary.totalSavingsPercentImprovement,
                    year: startYear,
                    contribution: contribution,
                    changeInContribution: changeInContribution,
                    changeInAdjustedBaseline: changeInAdjustedBaseline * 100
                });
                previousYearContribution = contribution;
                startYear++;
            }
            this.annualFacilityData.push({
                facility: facilitySummary.facility,
                annualData: annualData,
            })
        });

    }
}