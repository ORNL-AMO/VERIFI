import { AnalysisGroup, IdbPredictorEntry, PredictorData } from "./idb";

// export interface AnnualGroupSummary {
//   year: number,
//   totalEnergy: number,
//   totalEnergySavings: number,
//   annualEnergySavings: number,
//   totalProduction: number,
//   annualProductionChange: number,
//   totalProductionChange: number,
//   energyIntensity: number,
//   totalEnergyIntensityChange: number,
//   annualEnergyIntensityChange: number,
//   group: AnalysisGroup
// }


export interface MonthlyGroupSummary {
  date: Date,
  energyUse: number,
  production: number,
  energyIntensity: number,
  fiscalYear: number
}



export interface FacilityGroupSummary {
  group: AnalysisGroup,
  monthlyGroupSummary: MonthlyAnalysisSummary,
  baselineAnalysisSummary: AnnualAnalysisSummary,
  percentBaseline: number,
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>
}


export interface MonthlyFacilityAnalysisData {
  date: Date,
  fiscalYear: number,
  utilityUsage: Array<{
    meterGroupId: number,
    usage: number,
    modeledUsage: number,
    percentUsage: number
  }>,
  predictorUsage: Array<{
    predictorId: string,
    usage: number
  }>,
  yearToDateSavings: Array<{
    meterGroupId: number,
    savings: number
  }>,
  rollingSavings: Array<{
    meterGroupId: number,
    savings: number
  }>,
  yearToDateImprovment: number,
  monthlyIncrementalImprovement: number,
  rolling12MonthImprovement: number
}

// export interface MonthlyAnalysisSummary {
//   predictorVariables: Array<PredictorData>,
//   modelYear: number,
//   monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>
// }

// export interface MonthlyAnalysisSummaryData {
//   totalEnergy: number,
//   predictorUsage?: Array<number>,
//   modeledEnergy: number,
//   date: Date,
//   monthlySavings: number,
//   yearToDateImprovementOverBaseline: number,
//   yearToDateImprovementOverFiscalYear: number,
//   rollingYearImprovement: number,
//   group: AnalysisGroup,
//   fiscalYear: number,
//   yearToDateSEnPI: number,
//   rollingSEnPI: number,
//   monthlyIncrementalImprovement: number,
//   rolling12MonthImprovement: number,
//   energyIntensity: number
// }



export interface MonthlyAnalysisSummary {
  predictorVariables: Array<PredictorData>,
  modelYear: number,
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>
}

export interface MonthlyAnalysisSummaryData {
  date: Date,
  energyUse: number,
  modeledEnergy: number,
  predictorUsage?: Array<{
    usage: number,
    predictorId: string
  }>,
  fiscalYear: number,
  group: AnalysisGroup,
  adjustedBaselineEnergyUse: number,
  SEnPI: number,
  savings: number,
  percentSavingsComparedToBaseline: number,
  yearToDateSavings: number,
  yearToDatePercentSavings: number,
  rollingSavings: number,
  rolling12MonthImprovement: number,  
  groupsSummaryData?: Array<MonthlyAnalysisSummaryData>
}

export interface AnnualAnalysisSummary {
  year: number,
  energyUse: number,
  modeledEnergy: number,
  adjustedBaselineEnergyUse: number,
  SEnPI: number,
  savings: number,
  totalSavingsPercentImprovement: number,
  annualSavingsPercentImprovement: number,
  adjustmentToBaseline: number,
  cummulativeSavings: number,
  newSavings: number,
  predictorUsage?: Array<{
    usage: number,
    predictorId: string
  }>,
}


export interface AnalysisTableColumns {
  incrementalImprovement: boolean,
  SEnPI: boolean,
  savings: boolean,
  percentSavingsComparedToBaseline: boolean,
  yearToDateSavings: boolean,
  yearToDatePercentSavings: boolean,
  rollingSavings: boolean,
  rolling12MonthImprovement: boolean,
  productionVariables: boolean,
  energy: boolean,
  actualEnergy: boolean,
  modeledEnergy: boolean,
  adjustedEnergy: boolean,
  totalSavingsPercentImprovement: boolean,
  annualSavingsPercentImprovement: boolean,
  adjustmentToBaseline: boolean,
  cummulativeSavings: boolean,
  newSavings: boolean,
  predictors: Array<{
    predictor: PredictorData,
    display: boolean,
    usedInAnalysis: boolean
  }>
}
