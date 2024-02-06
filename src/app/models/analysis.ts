import { PredictorData } from "./idb";

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

export interface MonthlyAnalysisSummary {
  predictorVariables: Array<PredictorData>,
  modelYear: number,
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>
}

export interface MonthlyAnalysisSummaryData {
  date: Date,
  energyUse: number,
  modeledEnergy: number,
  // adjustedForNormalization: number,
  adjusted: number,
  baselineAdjustmentForNormalization: number,
  baselineAdjustmentForOther: number,
  baselineAdjustment: number,
  predictorUsage?: Array<{
    usage: number,
    predictorId: string
  }>,
  fiscalYear: number,
  group: AnalysisGroup,
  SEnPI: number,
  savings: number,
  percentSavingsComparedToBaseline: number,
  yearToDateSavings: number,
  yearToDatePercentSavings: number,
  rollingSavings: number,
  rolling12MonthImprovement: number,
  // groupsSummaryData?: Array<MonthlyAnalysisSummaryData>,
  modelYearDataAdjustment: number,
  dataAdjustment: number
}

export interface AnnualAnalysisSummary {
  year: number,
  energyUse: number,
  modeledEnergy: number,
  // adjustedForNormalization: number,
  adjusted: number,
  baselineAdjustmentForNormalization: number,
  baselineAdjustmentForOther: number,
  baselineAdjustment: number,
  SEnPI: number,
  savings: number,
  totalSavingsPercentImprovement: number,
  annualSavingsPercentImprovement: number,
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
  adjustedForNormalization: boolean,
  adjusted: boolean,
  baselineAdjustmentForNormalization: boolean,
  baselineAdjustmentForOther: boolean,
  baselineAdjustment: boolean,
  totalSavingsPercentImprovement: boolean,
  annualSavingsPercentImprovement: boolean,
  cummulativeSavings: boolean,
  newSavings: boolean,
  predictors: Array<{
    predictor: PredictorData,
    display: boolean,
    usedInAnalysis: boolean
  }>,
  predictorGroupId: string
}


export interface JStatRegressionModel {
  coef?: Array<number>,
  R2?: number,
  SSE?: number,
  SSR?: number,
  SST?: number,
  adjust_R2?: number,
  df_model?: number,
  df_resid?: number,
  ybar?: number,
  t: {
    se?: Array<number>,
    sigmaHat?: number
    p?: Array<number>
  },
  f: {
    pvalue?: number,
    F_statistic?: number
  },
  modelYear: number,
  predictorVariables: Array<PredictorData>,
  modelId: string,
  isValid: boolean,
  modelPValue: number,
  modelNotes: Array<string>,
  errorModeling?: boolean,
  SEPValidation?: Array<SEPValidation>
}

export interface SEPValidation {
  predictorVariable: string,
  meanReportYear: number,
  meanBaselineYear: number,
  modelMin: number,
  modelMinValid: boolean,
  modelMax: number,
  modelMaxValid: boolean,
  modelPlus3StdDev: number,
  modelPlus3StdDevValid: boolean,
  modelMinus3StdDev: number,
  modelMinus3StdDevValid: boolean,
  isValid: boolean
}


export interface AnalysisSetupErrors {
  hasError: boolean,
  missingName: boolean,
  noGroups: boolean,
  missingReportYear: boolean,
  reportYearBeforeBaselineYear: boolean,
  groupsHaveErrors: boolean,
  missingBaselineYear: boolean,
  baselineYearAfterMeterDataEnd: boolean,
  baselineYearBeforeMeterDataStart: boolean
}

export interface AnalysisGroup {
  idbGroupId: string,
  analysisType: AnalysisType,
  predictorVariables: Array<PredictorData>,
  regressionModelYear: number,
  regressionConstant: number,
  groupErrors: GroupErrors,
  specifiedMonthlyPercentBaseload: boolean,
  averagePercentBaseload?: number,
  monthlyPercentBaseload: Array<{
    monthNum: number,
    percent: number
  }>,
  hasDataAdjustement: boolean,
  dataAdjustments: Array<{
    year: number,
    amount: number
  }>,
  hasBaselineAdjustmentV2: boolean,
  baselineAdjustmentsV2: Array<{
    year: number,
    amount: number
  }>,
  userDefinedModel: boolean,
  models?: Array<JStatRegressionModel>,
  selectedModelId?: string,
  dateModelsGenerated?: Date,
  regressionModelNotes?: string
}

export interface GroupErrors {
  hasErrors: boolean,
  missingProductionVariables: boolean,
  missingRegressionConstant: boolean,
  missingRegressionModelYear: boolean,
  missingRegressionModelSelection: boolean,
  missingRegressionPredictorCoef: boolean,
  noProductionVariables: boolean,
  invalidAverageBaseload: boolean,
  invalidMonthlyBaseload: boolean,
  missingGroupMeters: boolean,
  hasInvalidRegressionModel: boolean
}


export type AnalysisType = 'absoluteEnergyConsumption' | 'energyIntensity' | 'modifiedEnergyIntensity' | 'regression' | 'skip' | 'skipAnalysis';
export type AnalysisCategory = 'energy' | 'water';