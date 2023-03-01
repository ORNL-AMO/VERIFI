import { AnnualAnalysisSummary } from "./analysis";
import { IdbFacility, MeterSource } from "./idb";


export interface ReportOptions {
  title: string,
  notes: string,
  includeAccount: boolean,
  accountInfo: boolean,
  facilitySummaryTable: boolean,
  accountUtilityTable: boolean,
  accountFacilityCharts: boolean,
  includeFacilities: boolean,
  facilityMetersTable: boolean,
  facilityUtilityUsageTable: boolean,
  facilityInfo: boolean,
  templateId: number,
  electricity: boolean,
  naturalGas: boolean,
  otherFuels: boolean,
  otherEnergy: boolean,
  water: boolean,
  wasteWater: boolean,
  otherUtility: boolean,
  facilities: Array<{
    facilityId: string,
    selected: boolean
  }>,
  baselineYear: number,
  targetYear: number,
  monthBarCharts: boolean,
  annualBarCharts: boolean,
  energyIsSource: boolean,
  meterReadings: boolean,
  reportType: 'data' | 'betterPlants',
  analysisItemId: string,
  baselineAdjustmentNotes: string,
  modificationNotes: string,
  includeFacilityNames: boolean
}


export interface BetterPlantsSummary {
  percentAnnualImprovement: number,
  percentTotalImprovement: number,
  adjustedBaselinePrimaryEnergy: number,
  // baselineAdjustment: number,
  totalEnergySavings: number,
  baselineYearResults: BetterPlantsEnergySummary,
  reportYearResults: BetterPlantsEnergySummary,
  reportYearAnalysisSummary: AnnualAnalysisSummary,
  baselineYearAnalysisSummary: AnnualAnalysisSummary,
  facilityPerformance: Array<{
    facility: IdbFacility,
    performance: number
  }>
}



export interface BetterPlantsEnergySummary {
  numberOfFacilities: number,
  electricityUse: number,
  naturalGasUse: number,
  distilateFuelUse: number,
  residualFuelUse: number,
  coalUse: number,
  cokeEnergyUse: number,
  blastFurnaceEnergyUse: number,
  woodWasteEnergyUse: number,
  otherGasFuels: Array<string>,
  otherGasUse: number,
  otherSolidFuels: Array<string>,
  otherSolidUse: number,
  otherLiquidFuels: Array<string>,
  otherLiquidUse: number,
  totalEnergyUse: number,
  otherEnergyUse: number,
  otherEnergyTypes: Array<string>
}

export interface BetterPlantsReportSetup {
  analysisItemId: string,
  includeFacilityNames: boolean,
  baselineAdjustmentNotes: string,
  modificationNotes: string,
}

export interface DataOverviewReportSetup {
  energyIsSource: boolean,
  emissionsDisplay: 'market' | 'location',
  includeEnergySection: boolean,
  includeCostsSection: boolean,
  includeEmissionsSection: boolean,
  includeWaterSection: boolean,
  includeMap: boolean,
  includeFacilityTable: boolean,
  includeFacilityDonut: boolean,
  includeUtilityTable: boolean,
  includeStackedBarChart: boolean,
  includeMonthlyLineChart: boolean,
  includedFacilities: Array<{
    facilityId: string,
    included: boolean
  }>,
  includeAccountReport: boolean,
  includeFacilityReports: boolean,
  includeMeterUsageStackedLineChart: boolean,
  includeMeterUsageTable: boolean,
  includeMeterUsageDonut: boolean,
  includeUtilityTableForFacility: boolean,
  includeAnnualBarChart: boolean,
  includeMonthlyLineChartForFacility: boolean
}