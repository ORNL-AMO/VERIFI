import { AnalysisDataCheckGroup, AnalysisDataChecks } from '@domain/reports/analysis-data-checks';

export interface AnalysisChecksWorkflow {
  readonly key: string;
  readonly completed: boolean;
  readonly canConfirm: boolean;
  readonly saving: boolean;
  readonly blocked: boolean;
  readonly message?: string;
  readonly error?: string;
}

/** Include failed flags even when a legacy model has no explanatory notes. */
export function analysisGroupIssues(item: AnalysisDataCheckGroup) {
  const critical = [...item.critical];
  const moderate = [...item.moderate];
  if (item.model?.isValid === false && !critical.length) critical.push('The regression model is invalid.');
  if ((item.model?.SEPValidationPass === false || item.model?.SEPValidation?.some(validation => !validation.isValid
    || [validation.modelMinValid, validation.modelMaxValid, validation.modelMinus3StdDevValid, validation.modelPlus3StdDevValid].some(valid => valid === false))) && !moderate.length) {
    moderate.push('Predictor data validation failed. Review the data validation table.');
  }
  return { critical, moderate, minor: item.minor };
}

export function summarizeAnalysisChecks(checks: readonly AnalysisDataChecks[], years: readonly number[]) {
  const issues = checks.flatMap(check => check.groups.map(analysisGroupIssues));
  return {
    blocked: !years.length || years.some(year => !checks.some(check => check.reportYear === year && check.groups.length > 0))
      || checks.some(check => check.hasBlockingErrors) || issues.some(item => item.critical.length > 0),
    hasIssues: issues.some(item => item.critical.length + item.moderate.length + item.minor.length > 0)
  };
}
