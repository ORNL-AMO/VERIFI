import { IdbFacility, MeterSource } from "./idb";

export interface BarChartDataTrace {
  x: Array<string>,
  y: Array<number>,
  name: string,
  type: string,
  marker: {
    color: string
  }
}


export interface ReportUtilitySummary {
  utilitySummaries: Array<UtilitySummary>,
  totals: UtilitySummary,
  pastYearStart: Date,
  pastYearEnd: Date,
  yearPriorStart: Date,
  yearPriorEnd: Date
}

export interface UtilitySummary {
  source: MeterSource,
  consumptionPastYear: number,
  costPastYear: number,
  emissionsPastYear: number,
  consumptionYearPrior: number,
  costYearPrior: number,
  emissionsYearPrior: number,
  consumptionChange: number,
  costChange: number,
  emissionsChange: number
}


export interface ReportOptions {
  title: string,
  notes: string,
  includeAccount: boolean,
  accountInfo: boolean,
  facilitySummaryTable: boolean,
  accountUtilityTable: boolean,
  accountFacilityCharts: boolean,
  accountFacilityAnnualBarChart: boolean,
  includeFacilities: boolean,
  facilityMetersTable: boolean,
  facilityUtilityUsageTable: boolean,
  facilityInfo: boolean,
  facilityBarCharts: boolean,
  templateId: number,
  electricity: boolean,
  naturalGas: boolean,
  otherFuels: boolean,
  otherEnergy: boolean,
  water: boolean,
  wasteWater: boolean,
  otherUtility: boolean,
  facilities: Array<IdbFacility>,
}