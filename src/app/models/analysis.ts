import { AnalysisGroup, PredictorData } from "./idb";

export interface AnnualGroupSummary {
  year: number,
  totalEnergy: number,
  totalEnergySavings: number,
  annualEnergySavings: number,
  totalProduction: number,
  annualProductionChange: number,
  totalProductionChange: number,
  energyIntensity: number,
  totalEnergyIntensityChange: number,
  annualEnergyIntensityChange: number,
  group: AnalysisGroup
}


export interface MonthlyGroupSummary {
  date: Date,
  energyUse: number,
  production: number,
  energyIntensity: number,
  fiscalYear: number
}


export interface FacilityYearGroupSummary {
  year: number,
  // group: AnalysisGroup,
  // percentBaseline: number,
  energyIntensity: number,
  annualEnergyIntensityChange: number,
  energyIntensityImprovement: number,
  annualImprovementContribution: number,
  totalImprovementContribution: number,
  totalEnergySavings: number,
  annualEnergySavings: number,
  totalEnergy: number,
  totalProduction: number
}

export interface FacilityGroupSummary {
  group: AnalysisGroup,
  collapsed: boolean,
  percentBaseline: number,
  summaries: Array<FacilityYearGroupSummary>,
}

export interface FacilityGroupTotals {
  year: number,
  // improvementContribution: number,
  totalSavings: number,
  newSavings: number,
  energyIntensity: number,
  annualEnergyIntensityChange: number,
  energyIntensityImprovement: number,
  totalEnergy: number,
  // totalProduction: number,
  totalEnergySavings: number,
  annualEnergySavings: number
}


export interface MonthlyAnalysisSummary {
  predictorVariables: Array<PredictorData>,
  modelYear: number,
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>
}

export interface MonthlyAnalysisSummaryData {
  totalEnergy: number,
  predictorUsage?: Array<number>,
  modeledEnergy: number,
  date: Date,
  monthlySavings: number,
  yearToDateImprovementOverBaseline: number,
  yearToDateImprovementOverFiscalYear: number,
  rollingYearImprovement: number,
  group: AnalysisGroup,
  fiscalYear: number,
  yearToDateSEnPI: number,
  rollingSEnPI: number,
  monthlyIncrementalImprovement: number,
  rolling12MonthImprovement: number,
  energyIntensity: number
}


export interface AnnualAnalysisSummary {
  year: number,
  energyUse: number,
  annualEnergySavings: number,
  totalEnergySavings: number,
  modeledEnergyUse: number,
  annualModeledEnergySavings: number,
  totalModeledEnergySavings: number,
  SEnPI: number,
  cumulativeSavings: number,
  annualSavings: number,

  totalProduction: number,
  annualProductionChange: number,
  totalProductionChange: number,
  energyIntensity: number,
  totalEnergyIntensityChange: number,
  annualEnergyIntensityChange: number,
  group?: AnalysisGroup
}