import { IdbAccount } from "./account";
import { IdbFacility } from "./facility";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbUtilityMeterGroup } from "./utilityMeterGroup";
import { BetterClimateReportSetup, BetterPlantsReportSetup, DataOverviewReportSetup, PerformanceReportSetup } from '../overview-report';
import { ReportType } from "../constantsAndTypes";

export interface IdbAccountReport extends IdbEntry {
    id?: number,
    guid: string,
    accountId: string,
    overviewReportId?: string,
    baselineYear: number,
    reportYear: number,
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number,
    name: string,
    reportType: ReportType,
    betterPlantsReportSetup: BetterPlantsReportSetup,
    dataOverviewReportSetup: DataOverviewReportSetup,
    performanceReportSetup: PerformanceReportSetup,
    betterClimateReportSetup: BetterClimateReportSetup
}

export function getNewIdbAccountReport(account: IdbAccount, facilities: Array<IdbFacility>, groups: Array<IdbUtilityMeterGroup>): IdbAccountReport {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: account.guid,
        name: 'Account Report',
        reportType: undefined,
        reportYear: undefined,
        baselineYear: undefined,
        startYear: undefined,
        startMonth: undefined,
        endYear: undefined,
        endMonth: undefined,
        betterPlantsReportSetup: {
            analysisItemId: undefined,
            includeFacilityNames: true,
            modificationNotes: undefined,
            baselineAdjustmentNotes: undefined,
        },
        dataOverviewReportSetup: {
            energyIsSource: account.energyIsSource,
            emissionsDisplay: 'location',
            includeMap: true,
            includeFacilityTable: true,
            includeFacilityDonut: true,
            includeUtilityTable: true,
            includeStackedBarChart: true,
            includeMonthlyLineChart: true,
            includeCostsSection: true,
            includeEmissionsSection: true,
            includeEnergySection: true,
            includeWaterSection: true,
            includeAllMeterData: true,
            includedFacilities: facilities.map(facility => {
                return {
                    facilityId: facility.guid,
                    included: true,
                    includedGroups: getFacilityGroups(facility.guid, groups)
                }
            }),
            includeAccountReport: true,
            includeFacilityReports: true,
            includeMeterUsageStackedLineChart: true,
            includeMeterUsageTable: true,
            includeMeterUsageDonut: true,
            includeUtilityTableForFacility: true,
            includeAnnualBarChart: true,
            includeMonthlyLineChartForFacility: true
        },
        performanceReportSetup: {
            analysisItemId: undefined,
            includeFacilityPerformanceDetails: true,
            includeUtilityPerformanceDetails: true,
            includeGroupPerformanceDetails: false,
            groupPerformanceByYear: false,
            includeTopPerformersTable: true,
            numberOfTopPerformers: 5,
            includeActual: false,
            includeAdjusted: true,
            includeContribution: true,
            includeSavings: true,
        },
        betterClimateReportSetup: {
            emissionsDisplay: 'location',
            initiativeNotes: [],
            includePortfolioInformation: true,
            includeAbsoluteEmissions: true,
            includeGHGEmissionsReductions: true,
            includePortfolioEnergyUse: true,
            includeCalculationsForGraphs: false,
            includeFacilitySummaries: true,
            numberOfTopPerformers: 5,
            skipIntermediateYears: false,
            includeEmissionsInTables: true,
            includePercentReductionsInTables: true,
            includePercentContributionsInTables: true,
            includeVehicleEnergyUse: true,
            includeStationaryEnergyUse: true,
            selectMeterData: false,
            includedFacilityGroups: facilities.map(facility => {
                return {
                    facilityId: facility.guid,
                    include: true,
                    groups: getFacilityGroups(facility.guid, groups)
                }
            }),
        }
    }
}

export function getFacilityGroups(facilityId: string, groups: Array<IdbUtilityMeterGroup>): Array<{ groupId: string, include: boolean }> {
    let facilityGroups: Array<{ groupId: string, include: boolean }> = new Array();
    groups.forEach(group => {
        if (group.facilityId == facilityId) {
            facilityGroups.push({
                groupId: group.guid,
                include: true
            });
        }
    });
    return facilityGroups;
}