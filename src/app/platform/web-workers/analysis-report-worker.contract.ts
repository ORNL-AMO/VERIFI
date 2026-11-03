import { BetterPlantsSummary } from '@data/models/overview-report';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { AnalysisReportInputs, CheckedAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';

export type AnalysisReportWorkerRequest =
  | { readonly operation: 'checks'; readonly inputs: CheckedAnalysisReportInputs; readonly years: readonly number[] }
  | { readonly operation: 'better-plants'; readonly inputs: AnalysisReportInputs; readonly years: readonly number[] };
export type AnalysisReportWorkerResponse =
  | { readonly ok: true; readonly operation: 'checks'; readonly value: readonly AnalysisDataChecks[] }
  | { readonly ok: true; readonly operation: 'better-plants'; readonly value: readonly BetterPlantsSummary[] }
  | { readonly ok: false; readonly message: string };
