import { BetterPlantsSummary } from '@data/models/overview-report';
import { BetterPlantsReportClass } from '@domain/calculations/better-plants-calculations/betterPlantsReportClass';
import { AnalysisReportInputs } from './analysis-report-inputs';

export function calculateBetterPlantsReport(inputs: AnalysisReportInputs, years: readonly number[]): readonly BetterPlantsSummary[] {
  const detached = structuredClone(inputs);
  return years.map(year => new BetterPlantsReportClass(detached.analysis.baselineYear, year, detached.analysis,
    [...detached.predictorData], detached.account, [...detached.facilities], [...detached.facilityAnalyses],
    [...detached.meters], [...detached.meterData], [...detached.predictors]).getBetterPlantsSummary());
}
