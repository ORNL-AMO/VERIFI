import { AnalysisTableColumns } from "../analysis";
import { IdbFacility } from "./facility";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityReport extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    facilityReportType: FacilityReportType,
    analysisItemId: string,
    analysisReportSettings: AnalysisReportSettings
    sepReportSettings: SepReportSettings
}

export function getNewIdbFacilityReport(facility: IdbFacility, reportType: FacilityReportType): IdbFacilityReport {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facility.guid,
        accountId: facility.accountId,
        facilityReportType: reportType,
        analysisItemId: undefined,
        name: 'New Report',
        analysisReportSettings: getAnalysisReportSettings(),
        sepReportSettings: {
            facilityName: facility.name,
            boundaries: undefined,
            auditStartDate: undefined,
            sepEnrollmentNumber: facility.sepEnrollmentNumber
        }
    }
}

export type FacilityReportType = 'analysis' | 'SEP';


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

export interface SepReportSettings {
    facilityName: string,
    boundaries: string,
    auditStartDate: Date,
    sepEnrollmentNumber: string
}