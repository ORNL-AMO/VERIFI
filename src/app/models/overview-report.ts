import { AnnualAnalysisSummary } from "./analysis";
import { IdbFacility } from "./idb";

export interface BetterPlantsSummary {
  percentAnnualImprovement: number,
  percentTotalEnergyImprovement: number,
  percentTotalWaterImprovement: number,
  adjustedBaselinePrimaryEnergy: number,
  adjustedBaselinePrimaryWater: number,
  // baselineAdjustment: number,
  totalEnergySavings: number,
  totalWaterSavings: number,
  baselineYearEnergyResults: BetterPlantsEnergySummary,
  reportYearEnergyResults: BetterPlantsEnergySummary,
  baselineYearWaterResults: BetterPlantsWaterSummary,
  reportYearWaterResults: BetterPlantsWaterSummary,
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

export interface BetterPlantsWaterSummary {
  numberOfFacilities: number;
  numberOfManufacturingFacilities: number;
  // waterUtilityUse: number;
  surfaceFreshwater: WaterSummaryItem;
  groundFreshwater: WaterSummaryItem;
  otherFreshwater: WaterSummaryItem;
  salineWaterIntake: WaterSummaryItem;
  rainwater: WaterSummaryItem;
  externallySuppliedRecycled: WaterSummaryItem;
  totalWaterIntake: number;
  waterUtility: WaterSummaryItem
}

export interface WaterSummaryItem {
  use: number,
  meteredType: 'Metered' | 'Estimated' | 'Mixed' | 'N/A'
}

export interface BetterPlantsReportSetup {
  analysisItemId: string,
  includeFacilityNames: boolean,
  baselineAdjustmentNotes: string,
  modificationNotes: string,
  methodologyNotes?: string
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