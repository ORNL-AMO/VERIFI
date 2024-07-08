import { AnnualAnalysisSummary } from "./analysis";
import { IdbFacility } from "./idb";

export interface BetterPlantsSummary {
  reportYear: number,
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
  additionalSurfaceFreshWater: WaterSummaryItem;
  groundFreshwater: WaterSummaryItem;
  additionalGroundFreshwater: WaterSummaryItem;
  otherFreshwater: WaterSummaryItem;
  additionalOtherFreshwater: WaterSummaryItem;
  salineWaterIntake: WaterSummaryItem;
  additionalSalineWaterIntake: WaterSummaryItem;
  rainwater: WaterSummaryItem;
  additionalRainwater: WaterSummaryItem;
  externallySuppliedRecycled: WaterSummaryItem;
  additionalExternallySuppliedRecycled: WaterSummaryItem;
  totalWaterIntake: number;
  waterUtility: WaterSummaryItem;
  additionalWaterUtility: WaterSummaryItem;
  totalWaterIntakeIncludeAdditional: number;
  unitsUsed: Array<string>;
}

export interface WaterSummaryItem {
  use: number,
  meteredType: 'Metered' | 'Estimated' | 'Mixed' | 'N/A'
}

export interface BetterPlantsReportSetup {
  analysisItemId: string,
  includeFacilityNames: boolean,
  includeAllYears?: boolean,
  baselineAdjustmentNotes: string,
  modificationNotes: string,
  methodologyNotes?: string,
  baselineYearWaterPilotGoal?: number,
  reportYearWaterPilotGoal?: number,
  includePerformanceTable?: boolean
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

export interface PerformanceReportSetup {
  analysisItemId: string,
  includeFacilityPerformanceDetails: boolean,
  includeUtilityPerformanceDetails: boolean,
  includeGroupPerformanceDetails: boolean,
  groupPerformanceByYear: boolean,
  numberOfTopPerformers: number,
  includeActual: boolean,
  includeAdjusted: boolean,
  includeContribution: boolean,
  includeSavings: boolean,
  includeTopPerformersTable: boolean
}


export interface BetterClimateReportSetup {
  emissionsDisplay: 'market' | 'location',
  initiativeNotes: Array<{
    year: number,
    note: string
  }>,
  includePortfolioInformation: boolean,
  includeAbsoluteEmissions: boolean,
  includeGHGEmissionsReductions: boolean,
  includePortfolioEnergyUse: boolean,
  includeCalculationsForGraphs: boolean,
  includeFacilitySummaries: boolean,
  numberOfTopPerformers: number,
  skipIntermediateYears: boolean,
  includeEmissionsInTables: boolean,
  includePercentReductionsInTables: boolean,
  includePercentContributionsInTables: boolean,
  includeVehicleEnergyUse: boolean,
  includeStationaryEnergyUse: boolean,
  selectMeterData: boolean,
  includedFacilityGroups: Array<{
    facilityId: string,
    include: boolean,
    groups: Array<{
      groupId: string,
      include: boolean
    }>
  }>
}