import { AnnualAnalysisSummary } from "./analysis";
import { IdbFacility, MeterSource } from "./idb";

export interface BarChartDataTrace {
  x: Array<string | number>,
  y: Array<number>,
  width?: Array<number>
  name: string,
  type: string,
  marker: {
    color: string
  }
}


export interface ReportUtilitySummary {
  utilitySummaries: Array<UtilitySummary>,
  totals: UtilitySummary,
  targetYearStart: Date,
  targetYearEnd: Date,
  baselineYearStart: Date,
  baselineYearEnd: Date
}

export interface UtilitySummary {
  source: MeterSource,
  consumptionTargetYear: number,
  costTargetYear: number,
  emissionsTargetYear: number,
  consumptionBaselineYear: number,
  costBaselineYear: number,
  emissionsBaselineYear: number,
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
    facilityId: number,
    selected: boolean
  }>,
  baselineYear: number,
  targetYear: number,
  monthBarCharts: boolean,
  annualBarCharts: boolean,
  energyIsSource: boolean,
  meterReadings: boolean,
  reportType: 'data' | 'betterPlants',
  analysisItemId: number,
  baselineAdjustmentNotes: string,
  modificationNotes: string
}


export interface BetterPlantsSummary {
  baselineYearResults: BetterPlantsEnergySummary,
  reportYearResults: BetterPlantsEnergySummary,
  reportYearAnalysisSummary: AnnualAnalysisSummary,
  baselineYearAnalysisSummary: AnnualAnalysisSummary
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
  totalEnergyUse: number
}