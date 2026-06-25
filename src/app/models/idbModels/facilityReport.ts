import { AnalysisTableColumns } from "../analysis";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbUtilityMeterGroup } from "./utilityMeterGroup";

export interface IdbFacilityReport extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    checked?: boolean,
    facilityReportType: FacilityReportType,
    analysisItemId: string,
    analysisReportSettings: AnalysisReportSettings,
    dataOverviewReportSettings: DataOverviewFacilityReportSettings,
    savingsReportSettings: SavingsFacilityReportSettings,
    emissionFactorsReportSettings: EmissionFactorsReportSettings,
    modelingReportSettings: ModelingReportSettings,
    costSavingsReportSettings: CostSavingsReportSettings
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
        checked: false,
        analysisReportSettings: getAnalysisReportSettings(),
        dataOverviewReportSettings: getDataOverviewReportSettings(groups),
        savingsReportSettings: getSavingsReportSettings(),
        emissionFactorsReportSettings: getEmissionFactorsReportSettings(),
        modelingReportSettings: getModelingReportSettings(),
        costSavingsReportSettings: getCostSavingsReportSettings()
    }
}

export type FacilityReportType = 'analysis' | 'overview' | 'emissionFactors' | 'savings' | 'modeling' | 'costSavings';


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
        groupAnnualResultsGraphs: true,
        reportYear: undefined
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
    groupAnnualResultsGraphs: boolean,
    reportYear: number
}


export function getDataOverviewReportSettings(groups: Array<IdbUtilityMeterGroup>): DataOverviewFacilityReportSettings {
    return {
        energyIsSource: true,
        emissionsDisplay: 'market',
        includeEnergySection: true,
        includeCostsSection: true,
        includeEmissionsSection: false,
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

export function getSavingsReportSettings(): SavingsFacilityReportSettings {
    return {
        endYear: undefined,
        endMonth: undefined,
        facilityAnnualResults: true,
        facilityAnnualResultsTable: true,
        facilityMonthlyResults: true,
        facilityMonthlyResultsTable: true,
        facilityMonthlyResultsGraphs: true,
        facilityTrailingTwelveMonthsConsumption: true,
        facilityTrailingTwelveMonthsSavings: true,
        groupReports: true,
        groupMonthlyResults: true,
        groupMonthlyResultsTable: true,
        groupMonthlyResultsGraphs: true,
        groupTrailingTwelveMonthsConsumption: true,
        groupTrailingTwelveMonthsSavings: true,
        groupAnnualResultsTable: true,
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
        }
    };
}

export interface SavingsFacilityReportSettings {
    //using baseline year of analysis
    // startYear: number,
    // startMonth: number,
    endYear: number,
    endMonth: number,
    facilityAnnualResults: boolean,
    facilityAnnualResultsTable: boolean,
    facilityMonthlyResults: boolean,
    facilityMonthlyResultsTable: boolean,
    facilityMonthlyResultsGraphs: boolean,
    facilityTrailingTwelveMonthsConsumption: boolean,
    facilityTrailingTwelveMonthsSavings: boolean,
    groupReports: boolean,
    groupMonthlyResults: boolean,
    groupMonthlyResultsTable: boolean,
    groupMonthlyResultsGraphs: boolean,
    groupTrailingTwelveMonthsConsumption: boolean,
    groupTrailingTwelveMonthsSavings: boolean,
    groupAnnualResultsTable: boolean,
    analysisTableColumns: AnalysisTableColumns,
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

export function getModelingReportSettings(): ModelingReportSettings {
    return {
        reportYear: undefined,
        includeIssuesSummary: true,
        includeExecutiveSummary: true,
        includeDataValidationTables: true
    }
}

export interface ModelingReportSettings {
    reportYear: number,
    includeIssuesSummary: boolean,
    includeExecutiveSummary: boolean,
    includeDataValidationTables: boolean
}

export function getCostSavingsReportSettings(): CostSavingsReportSettings {
    return {
        endYear: undefined,
        endMonth: undefined,
        costSavingsTable: {},
        groupUnits: {},
        isDataComplete: false,
        annualSavingsTable: true,
        annualSavingsGraph: true,
        monthlySavingsTable: true,
        monthlySavingsGraph: true,
        annualCumulativeSavingsTable: true,
        annualCumulativeSavingsGraph: true,
        monthlyCumulativeSavingsTable: true,
        monthlyCumulativeSavingsGraph: true,
        userCostSummary: true,
        calculatedCostSummary: true,
        groupAnnualTable: true,
        groupMonthlyTable: true,
        includeFacility: true,
        includeAnnual: true,
        includeMonthly: true,
        includeGroup: true
    };
}

export interface CostSavingsReportSettings {
    endYear: number,
    endMonth: number,
    costSavingsTable: {
        [year: number]: {[groupId: string]: number}
    },
    groupUnits: {[groupId: string]: string},
    isDataComplete?: boolean,
    annualSavingsTable: boolean,
    annualSavingsGraph: boolean,
    monthlySavingsTable: boolean,
    monthlySavingsGraph: boolean,
    annualCumulativeSavingsTable: boolean,
    annualCumulativeSavingsGraph: boolean,
    monthlyCumulativeSavingsTable: boolean,
    monthlyCumulativeSavingsGraph: boolean,
    userCostSummary: boolean,
    calculatedCostSummary: boolean,
    groupAnnualTable: boolean,
    groupMonthlyTable: boolean,
    includeFacility: boolean,
    includeAnnual: boolean,
    includeMonthly: boolean,
    includeGroup: boolean
}