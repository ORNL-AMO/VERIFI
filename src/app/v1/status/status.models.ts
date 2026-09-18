export type StatusSeverity = 'error' | 'warning' | 'information';
export type StatusCategory = 'configuration' | 'completeness' | 'currency' | 'quality' | 'readiness';
export type StatusEntityKind = 'account' | 'facility' | 'meter' | 'predictor' | 'analysis-group' | 'facility-analysis' | 'account-analysis' | 'facility-report' | 'account-report';
export type StatusEvaluationState = 'idle' | 'evaluating' | 'ready' | 'error';

export type StatusRuleCode =
  | 'account.configuration.default-name'
  | 'account.facilities.missing'
  | 'facility.meters.missing'
  | 'facility.meter-groups.missing'
  | 'facility.predictors.missing'
  | 'meter.configuration.invalid'
  | 'meter.data.missing'
  | 'meter.data.duplicate-date'
  | 'meter.data.negative'
  | 'meter.data.gap'
  | 'meter.calendarization.missing'
  | 'meter.currency.stale'
  | 'meter.currency.behind-facility'
  | 'meter.quality.consumption-outlier'
  | 'meter.quality.cost-outlier'
  | 'predictor.data.missing'
  | 'predictor.data.duplicate-month'
  | 'predictor.data.gap'
  | 'predictor.data.negative'
  | 'predictor.currency.stale'
  | 'predictor.currency.behind-facility'
  | 'predictor.weather.warning'
  | 'analysis.configuration.invalid'
  | 'analysis-group.setup.invalid'
  | 'analysis-group.model.invalid'
  | 'analysis-group.inputs.invalid'
  | 'account-analysis.configuration.invalid'
  | 'account-analysis.children.warning'
  | 'report.configuration.invalid'
  | 'report.dates.invalid'
  | 'report.analysis.invalid'
  | 'report.data.incomplete'
  | 'report.analysis.warning';

export interface StatusEntityRef {
  readonly kind: StatusEntityKind;
  readonly guid: string;
  readonly name: string;
  readonly accountGuid: string;
  readonly facilityGuid?: string;
}

export type StatusEvidenceValue = string | number | boolean | readonly string[];

export interface StatusFinding {
  readonly id: string;
  readonly code: StatusRuleCode;
  readonly severity: StatusSeverity;
  readonly category: StatusCategory;
  readonly entity: StatusEntityRef;
  readonly evidence: Readonly<Record<string, StatusEvidenceValue>>;
}

export interface StatusSummary {
  readonly state: 'valid' | StatusSeverity;
  readonly total: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

export type StatusDestination =
  | { readonly kind: 'account-settings'; readonly accountGuid: string; readonly detail: string }
  | { readonly kind: 'facility-data'; readonly facilityGuid: string; readonly detail: string }
  | { readonly kind: 'meter-tab'; readonly facilityGuid: string; readonly meterGuid: string; readonly tab: 'settings' | 'readings' | 'quality' }
  | { readonly kind: 'unavailable' };

export interface StatusItem extends StatusFinding {
  readonly title: string;
  readonly description: string;
  readonly todo: boolean;
  readonly destination: StatusDestination;
}

export interface StatusEvaluation {
  readonly accountGuid: string;
  readonly revision: number;
  readonly evaluatedAt: string;
  readonly findings: readonly StatusFinding[];
}

export function makeFinding(
  code: StatusRuleCode,
  severity: StatusSeverity,
  category: StatusCategory,
  entity: StatusEntityRef,
  evidence: Readonly<Record<string, StatusEvidenceValue>> = {}
): StatusFinding {
  return {
    id: `${code}:${entity.kind}:${entity.guid}`,
    code,
    severity,
    category,
    entity,
    evidence
  };
}

export function summarizeFindings(findings: readonly StatusFinding[]): StatusSummary {
  const errorCount = findings.filter(finding => finding.severity === 'error').length;
  const warningCount = findings.filter(finding => finding.severity === 'warning').length;
  const infoCount = findings.filter(finding => finding.severity === 'information').length;
  return {
    state: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : infoCount > 0 ? 'information' : 'valid',
    total: findings.length,
    errorCount,
    warningCount,
    infoCount
  };
}
