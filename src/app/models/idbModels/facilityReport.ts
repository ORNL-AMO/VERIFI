import { AnalysisTableColumns } from "../analysis";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbUtilityMeterGroup } from "./utilityMeterGroup";

export interface IdbFacilityReport extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    facilityReportType: FacilityReportType,
    analysisItemId: string,
    analysisReportSettings: AnalysisReportSettings,
    dataOverviewReportSettings: DataOverviewFacilityReportSettings,
    emissionFactorsReportSettings: EmissionFactorsReportSettings
}

export function getNewIdbFacilityReport(facilityId: string, accountId: string, reportType: FacilityReportType, groups: Array<IdbUtilityMeterGroup>): IdbFacilityReport {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        facilityReportType: reportType,
        analysisItemId: undefined,
        name: 'New Report',
        analysisReportSettings: getAnalysisReportSettings(),
        dataOverviewReportSettings: getDataOverviewReportSettings(groups),
        emissionFactorsReportSettings: getEmissionFactorsReportSettings()
    }
}

export type FacilityReportType = 'analysis' | 'overview' | 'emissionFactors';


export function getAnalysisReportSettings(): AnalysisReportSettings {
    return {
        analysisTableColumns: {
            incrementalImprovement: false,
            SEnPI: false,
            savings: false,
            percentSavingsComparedToBaseline: false,
            yearToDateSavings: false,
            yearToDatePercentSavings: false,
            rollingSavings: false,
            rolling12MonthImprovement: false,
            productionVariables: true,
            energy: true,
            actualEnergy: true,
            modeledEnergy: true,
            adjusted: true,
            baselineAdjustmentForNormalization: true,
            baselineAdjustmentForOther: true,
            baselineAdjustment: true,
            totalSavingsPercentImprovement: true,
            annualSavingsPercentImprovement: true,
            cummulativeSavings: true,
            newSavings: true,
            predictors: [],
            predictorGroupId: undefined,
            bankedSavings: false,
            savingsUnbanked: false
        },
        facilityAnnualResults: true,
        facilityAnnualResultsTable: true,
        facilityAnnualResultsGraphs: true,
        facilityMonthlyResults: true,
        facilityMonthlyResultsTable: true,
        facilityMonthlyResultsTableBaselineYear: true,
        facilityMonthlyResultsTableReportYear: true,
        facilityMonthlyResultsGraphs: true,
        groupReports: true,
        groupModelDetails: true,
        groupMonthlyResults: true,
        groupMonthlyResultsTable: true,
        groupMonthlyResultsTableBaselineYear: true,
        groupMonthlyResultsTableReportYear: true,
        groupMonthlyResultsTableModelYear: true,
        groupMonthlyResultsGraphs: true,
        groupAnnualResults: true,
        groupAnnualResultsTable: true,
        groupAnnualResultsGraphs: true
    }
}

export interface AnalysisReportSettings {
    analysisTableColumns: AnalysisTableColumns,
    facilityAnnualResults: boolean,
    facilityAnnualResultsTable: boolean,
    facilityAnnualResultsGraphs: boolean,
    facilityMonthlyResults: boolean,
    facilityMonthlyResultsTable: boolean,
    facilityMonthlyResultsTableBaselineYear: boolean,
    facilityMonthlyResultsTableReportYear: boolean,
    facilityMonthlyResultsGraphs: boolean
    groupReports: boolean,
    groupModelDetails: boolean,
    groupMonthlyResults: boolean,
    groupMonthlyResultsTable: boolean,
    groupMonthlyResultsTableBaselineYear: boolean,
    groupMonthlyResultsTableReportYear: boolean,
    groupMonthlyResultsTableModelYear: boolean,
    groupMonthlyResultsGraphs: boolean,
    groupAnnualResults: boolean,
    groupAnnualResultsTable: boolean,
    groupAnnualResultsGraphs: boolean
}


export function getDataOverviewReportSettings(groups: Array<IdbUtilityMeterGroup>): DataOverviewFacilityReportSettings {
    return {
        energyIsSource: true,
        emissionsDisplay: 'market',
        includeEnergySection: true,
        includeCostsSection: true,
        includeEmissionsSection: true,
        includeWaterSection: true,
        includeAllMeterData: true,
        startYear: undefined,
        startMonth: undefined,
        endYear: undefined,
        endMonth: undefined,
        includeUtilityTableForFacility: true,
        includeAnnualBarChart: true,
        includeMonthlyLineChartForFacility: true,
        includeMeterUsageStackedLineChart: true,
        includeMeterUsageTable: true,
        includeMeterUsageDonut: true,
        includedGroups: groups.map(group => {
            return {
                groupId: group.guid,
                include: true
            }
        })
    }
}

export interface DataOverviewFacilityReportSettings {
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
    energyIsSource: boolean,
    emissionsDisplay: 'market' | 'location',
    includeEnergySection: boolean,
    includeCostsSection: boolean,
    includeEmissionsSection: boolean,
    includeWaterSection: boolean,
    // includeFacilityTable: boolean,
    // includeFacilityDonut: boolean,
    // includeUtilityTable: boolean,
    // includeStackedBarChart: boolean,
    // includeMonthlyLineChart: boolean,
    includeAllMeterData: boolean,
      includedGroups: Array<{
        groupId: string,
        include: boolean
      }>
    includeMeterUsageStackedLineChart: boolean,
    includeMeterUsageTable: boolean,
    includeMeterUsageDonut: boolean,
    includeUtilityTableForFacility: boolean,
    includeAnnualBarChart: boolean,
    includeMonthlyLineChartForFacility: boolean

}

export function getEmissionFactorsReportSettings(): EmissionFactorsReportSettings {
    return {
        startYear: undefined,
        endYear: undefined
    }
}

export interface EmissionFactorsReportSettings {
    startYear: number,
    endYear: number,
}