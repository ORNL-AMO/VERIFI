import { CalanderizedMeter } from "src/app/models/calanderization";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbPredictorEntry } from "src/app/models/idb";
import { getNeededUnits } from "../shared-calculations/calanderizationFunctions";
import { AnnualFacilityAnalysisSummaryClass } from "../analysis-calculations/annualFacilityAnalysisSummaryClass";
import { AnalysisGroup, AnnualAnalysisSummary } from "src/app/models/analysis";
import * as _ from 'lodash';
import { AnnualGroupAnalysisSummaryClass } from "../analysis-calculations/annualGroupAnalysisSummaryClass";
import { MonthlyAnalysisSummaryClass } from "../analysis-calculations/monthlyAnalysisSummaryClass";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";

export class PerformanceReport {

    reportYear: number;
    annualFacilityAnalysisSummaries: Array<{
        facility: IdbFacility,
        annualAnalysisSummary: Array<AnnualAnalysisSummary>,
        groupAnnualAnalysisSummary: Array<{
            group: AnalysisGroup,
            annualAnalysisSummary: Array<AnnualAnalysisSummary>,
            utilityClassification: MeterSource | 'Mixed'
        }>
    }>;
    annualFacilityData: Array<{
        facility: IdbFacility,
        annualData: Array<PerformanceReportAnnualData>,
    }>;

    annualGroupData: Array<{
        facility: IdbFacility,
        group: AnalysisGroup,
        annualData: Array<PerformanceReportAnnualData>,
    }>;

    annualUtilityData: Array<{
        utilityClassification: MeterSource | 'Mixed',
        annualData: Array<PerformanceReportAnnualData>,
    }>;

    facilityTotals: Array<{
        actual: number,
        adjusted: number,
        savings: number,
        contribution: number,
        maxContribution: number,
        minContribution: number,
        year: number,
        maxChangeInContribution: number,
        minChangeInContribution: number,
        changeInAdjustedBaseline: number,
        maxChangeInAdjustedBaseline: number,
        minChangeInAdjustedBaseline: number,
        changeInContribution: number
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
        this.reportYear = reportYear;
        this.setAnnualFacilityAnalysisSummaries(selectedAnalysisItem, facilities, accountPredictorEntries, accountAnalysisItems, meters, meterData);
        this.setAnnualFacilityData(baselineYear, reportYear);
        this.setFacilityTotals(baselineYear, reportYear);
        this.setAnnualGroupData(baselineYear, reportYear);
        this.setAnnualUtilityData(baselineYear, reportYear);
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
                let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, facility, false, { energyIsSource: facilityAnalysisItem.energyIsSource, neededUnits: getNeededUnits(facilityAnalysisItem) }, [], [], facilities);
                let facilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilityAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, false);
                let annualAnalysisSummary: Array<AnnualAnalysisSummary> = facilityAnalysisSummaryClass.getAnnualAnalysisSummaries();
                let groupAnnualAnalysisSummary: Array<{
                    group: AnalysisGroup,
                    annualAnalysisSummary: Array<AnnualAnalysisSummary>,
                    utilityClassification: MeterSource | 'Mixed'
                }> = new Array();
                facilityAnalysisItem.groups.forEach(group => {
                    if (group.analysisType != 'skip' && group.analysisType != 'skipAnalysis') {
                        let groupMonthlySummariesClass: MonthlyAnalysisSummaryClass = facilityAnalysisSummaryClass.groupMonthlySummariesClasses.find(groupClass => {
                            return groupClass.group.idbGroupId == group.idbGroupId;
                        });

                        let groupAnnualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(group, facilityAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, groupMonthlySummariesClass.getMonthlyAnalysisSummaryData());
                        groupAnnualAnalysisSummary.push({
                            group: group,
                            annualAnalysisSummary: groupAnnualAnalysisSummaryClass.getAnnualAnalysisSummaries(),
                            utilityClassification: groupAnnualAnalysisSummaryClass.utilityClassification
                        });
                    }
                });

                this.annualFacilityAnalysisSummaries.push({
                    facility: facility,
                    annualAnalysisSummary: annualAnalysisSummary,
                    groupAnnualAnalysisSummary: groupAnnualAnalysisSummary
                });
            }
        });
    }


    setAnnualFacilityData(baselineYear: number, reportYear: number) {
        this.annualFacilityData = new Array();
        let allAnnualSummaries: Array<AnnualAnalysisSummary> = this.annualFacilityAnalysisSummaries.flatMap(facilitySummary => {
            return facilitySummary.annualAnalysisSummary;
        });
        this.annualFacilityAnalysisSummaries.forEach(facilitySummary => {
            let annualData: Array<PerformanceReportAnnualData> = new Array();
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
                if (facilityYearSummary) {
                    let changeInContribution: number = 0;
                    let contribution: number = (facilityYearSummary.adjusted * facilityYearSummary.totalSavingsPercentImprovement) / totalAdjusted;
                    if (startYear == baselineYear) {
                        baselineYearAdjusted = facilityYearSummary.adjusted;
                    }
                    let changeInAdjustedBaseline: number = (facilityYearSummary.adjusted - baselineYearAdjusted) / baselineYearAdjusted;
                    if (startYear != baselineYear && startYear != (baselineYear + 1)) {
                        changeInContribution = (contribution - previousYearContribution);
                    } else if (startYear == (baselineYear + 1)) {
                        changeInContribution = contribution;
                    }
                    annualData.push({
                        adjusted: facilityYearSummary.adjusted,
                        actual: facilityYearSummary.energyUse,
                        savings: facilityYearSummary.totalSavingsPercentImprovement,
                        year: startYear,
                        contribution: contribution,
                        changeInContribution: changeInContribution,
                        changeInAdjustedBaseline: changeInAdjustedBaseline * 100
                    });
                    previousYearContribution = contribution;
                } else {
                    annualData.push({
                        adjusted: 0,
                        actual: 0,
                        savings: 0,
                        year: startYear,
                        contribution: 0,
                        changeInContribution: 0,
                        changeInAdjustedBaseline: 0
                    });
                }
                startYear++;

            }
            this.annualFacilityData.push({
                facility: facilitySummary.facility,
                annualData: annualData,
            })
        });
    }

    setFacilityTotals(baselineYear: number, reportYear: number) {
        this.facilityTotals = new Array();
        let allAnnualSummaries: Array<AnnualAnalysisSummary> = this.annualFacilityAnalysisSummaries.flatMap(facilitySummary => {
            return facilitySummary.annualAnalysisSummary;
        });

        let allAnnualData: Array<PerformanceReportAnnualData> = this.annualFacilityData.flatMap(data => { return data.annualData });

        let startYear: number = baselineYear;
        let baselineYearAdjusted: number = 0;
        let previousYearContribution: number = 0;
        while (startYear <= reportYear) {
            let yearSummaryData: Array<AnnualAnalysisSummary> = allAnnualSummaries.filter(summary => {
                return summary.year == startYear
            });
            let totalAdjusted: number = _.sumBy(yearSummaryData, (data: AnnualAnalysisSummary) => {
                return data.adjusted;
            });

            let actual: number = _.sumBy(yearSummaryData, (data: AnnualAnalysisSummary) => {
                return data.energyUse;
            });


            let totalSavings: number = (totalAdjusted - actual) / totalAdjusted;

            let yearAnnualData: Array<PerformanceReportAnnualData> = allAnnualData.filter(data => { return data.year == startYear });

            let contribution: number = _.sumBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.contribution;
            });

            let maxYearContribution: PerformanceReportAnnualData = _.maxBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.contribution;
            });

            let minYearContribution: PerformanceReportAnnualData = _.minBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.contribution;
            });
            let maxYearChangeInContribution: PerformanceReportAnnualData = _.maxBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.changeInContribution;
            });

            let minYearChangeInContribution: PerformanceReportAnnualData = _.minBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.changeInContribution;
            });
            let maxYearChangeInAdjustedBaseline: PerformanceReportAnnualData = _.maxBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.changeInAdjustedBaseline;
            });

            let minYearChangeInAdjustedBaseline: PerformanceReportAnnualData = _.minBy(yearAnnualData, (data: PerformanceReportAnnualData) => {
                return data.changeInAdjustedBaseline;
            });
            let changeInAdjustedBaseline: number = 0;

            if (startYear == baselineYear) {
                baselineYearAdjusted = totalAdjusted;
            }
            changeInAdjustedBaseline = (totalAdjusted - baselineYearAdjusted) / baselineYearAdjusted;
            this.facilityTotals.push({
                actual: actual,
                adjusted: totalAdjusted,
                contribution: contribution,
                savings: totalSavings * 100,
                year: startYear,
                maxContribution: maxYearContribution.contribution,
                minContribution: minYearContribution.contribution,
                maxChangeInContribution: maxYearChangeInContribution.changeInContribution,
                minChangeInContribution: minYearChangeInContribution.changeInContribution,
                changeInAdjustedBaseline: changeInAdjustedBaseline * 100,
                maxChangeInAdjustedBaseline: maxYearChangeInAdjustedBaseline.changeInAdjustedBaseline,
                minChangeInAdjustedBaseline: minYearChangeInAdjustedBaseline.changeInAdjustedBaseline,
                changeInContribution: (contribution - previousYearContribution)
            });
            previousYearContribution = contribution;
            startYear++;
        }
    }

    setAnnualGroupData(baselineYear: number, reportYear: number) {
        this.annualGroupData = new Array();
        let allAnnualSummaries: Array<AnnualAnalysisSummary> = this.annualFacilityAnalysisSummaries.flatMap(facilitySummary => {
            return facilitySummary.annualAnalysisSummary;
        });

        this.annualFacilityAnalysisSummaries.forEach(facilitySummary => {
            facilitySummary.groupAnnualAnalysisSummary.forEach(groupSummary => {
                let annualData: Array<PerformanceReportAnnualData> = new Array();
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
                    let facilityYearSummary: AnnualAnalysisSummary = groupSummary.annualAnalysisSummary.find(annualSummary => {
                        return annualSummary.year == startYear;
                    });
                    if (facilityYearSummary) {
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
                            actual: facilityYearSummary.energyUse,
                            savings: facilityYearSummary.totalSavingsPercentImprovement,
                            year: startYear,
                            contribution: contribution,
                            changeInContribution: changeInContribution,
                            changeInAdjustedBaseline: changeInAdjustedBaseline * 100
                        });
                        previousYearContribution = contribution;
                    } else {
                        annualData.push({
                            adjusted: 0,
                            actual: 0,
                            savings: 0,
                            year: startYear,
                            contribution: 0,
                            changeInContribution: 0,
                            changeInAdjustedBaseline: 0
                        });
                    }
                    startYear++;
                }
                this.annualGroupData.push({
                    facility: facilitySummary.facility,
                    group: groupSummary.group,
                    annualData: annualData,
                })
            });
        });
    }

    setAnnualUtilityData(baselineYear: number, reportYear: number) {
        this.annualUtilityData = new Array();
        let allAnnualSummaries: Array<AnnualAnalysisSummary> = this.annualFacilityAnalysisSummaries.flatMap(facilitySummary => {
            return facilitySummary.annualAnalysisSummary;
        });

        let includedSources: Array<MeterSource | 'Mixed'> = new Array();
        let allGroupSummaries: Array<{ utilityClassiciation: MeterSource | 'Mixed', annualAnalysisSummary: Array<AnnualAnalysisSummary> }> = new Array();
        this.annualFacilityAnalysisSummaries.forEach(facilitySummary => {
            facilitySummary.groupAnnualAnalysisSummary.forEach(groupSummary => {
                includedSources.push(groupSummary.utilityClassification)
                allGroupSummaries.push({
                    utilityClassiciation: groupSummary.utilityClassification,
                    annualAnalysisSummary: groupSummary.annualAnalysisSummary
                })
            })
        });
        includedSources = _.uniq(includedSources);

        includedSources.forEach(utilitySource => {
            let annualData: Array<PerformanceReportAnnualData> = new Array();
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

                let utilityGroupSummaries = allGroupSummaries.filter(summary => {
                    return summary.utilityClassiciation == utilitySource
                })

                let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = utilityGroupSummaries.flatMap(summary => {
                    return summary.annualAnalysisSummary
                });

                let startYearAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaries.filter(summary => {
                    return summary.year == startYear;
                })

                let adjusted: number = _.sumBy(startYearAnalysisSummaries, (summary: AnnualAnalysisSummary) => {
                    return summary.adjusted;
                });

                let energyUse: number = _.sumBy(startYearAnalysisSummaries, (summary: AnnualAnalysisSummary) => {
                    return summary.energyUse;
                });

                let totalSavingsPercentImprovement: number = (adjusted - energyUse) / adjusted;

                let changeInAdjustedBaseline: number = 0;
                let changeInContribution: number = 0;
                let contribution: number = (adjusted * (totalSavingsPercentImprovement * 100)) / totalAdjusted;
                if (startYear == baselineYear) {
                    baselineYearAdjusted = adjusted;
                }
                changeInAdjustedBaseline = (adjusted - baselineYearAdjusted) / baselineYearAdjusted;
                if (startYear != baselineYear && startYear != (baselineYear + 1)) {
                    changeInContribution = (contribution - previousYearContribution);
                } else if (startYear == (baselineYear + 1)) {
                    changeInContribution = contribution;
                }
                annualData.push({
                    adjusted: adjusted,
                    actual: energyUse,
                    savings: totalSavingsPercentImprovement * 100,
                    year: startYear,
                    contribution: contribution,
                    changeInContribution: changeInContribution,
                    changeInAdjustedBaseline: changeInAdjustedBaseline * 100
                });
                previousYearContribution = contribution;

                startYear++;
            }
            this.annualUtilityData.push({
                utilityClassification: utilitySource,
                annualData: annualData,
            })
        });
    }

}

export interface PerformanceReportAnnualData {
    adjusted: number,
    actual: number,
    savings: number,
    contribution: number,
    year: number,
    changeInContribution: number,
    changeInAdjustedBaseline: number
}