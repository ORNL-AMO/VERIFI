import { StatusWarningDismissal } from '@data/models/status-warning-dismissal';
import { StatusAttentionSummary, StatusEvidenceValue, StatusFinding } from './status.models';

export interface StatusFindingPartition {
  readonly active: readonly StatusFinding[];
  readonly discarded: readonly StatusFinding[];
}

export function partitionStatusFindings(
  findings: readonly StatusFinding[],
  dismissals: readonly StatusWarningDismissal[] = []
): StatusFindingPartition {
  const discardedKeys = new Set(dismissals.map(dismissal => dismissalKey(
    dismissal.findingId,
    dismissal.evidenceSignature
  )));
  const active: StatusFinding[] = [];
  const discarded: StatusFinding[] = [];

  findings.forEach(finding => {
    const isDiscarded = finding.severity === 'warning'
      && discardedKeys.has(dismissalKey(finding.id, statusFindingEvidenceSignature(finding)));
    (isDiscarded ? discarded : active).push(finding);
  });

  return { active, discarded };
}

export function createStatusWarningDismissal(
  finding: StatusFinding,
  discardedAt: string
): StatusWarningDismissal {
  if (finding.severity !== 'warning') {
    throw new Error('Only warning findings can be discarded.');
  }
  return {
    findingId: finding.id,
    evidenceSignature: statusFindingEvidenceSignature(finding),
    discardedAt
  };
}

export function statusFindingEvidenceSignature(finding: StatusFinding): string {
  const evidence = Object.keys(finding.evidence)
    .sort(compareText)
    .map(key => [key, normalizeEvidenceValue(finding.evidence[key])] as const);
  return JSON.stringify({
    severity: finding.severity,
    category: finding.category,
    evidence
  });
}

export function summarizeStatusAttention(findings: readonly StatusFinding[]): StatusAttentionSummary {
  const errorCount = findings.filter(finding => finding.severity === 'error').length;
  const warningCount = findings.filter(finding => finding.severity === 'warning').length;
  return {
    total: errorCount + warningCount,
    errorCount,
    warningCount,
    state: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'valid'
  };
}

function dismissalKey(findingId: string, evidenceSignature: string): string {
  return `${findingId}\u0000${evidenceSignature}`;
}

function normalizeEvidenceValue(value: StatusEvidenceValue): StatusEvidenceValue {
  return Array.isArray(value) ? [...value].sort(compareText) : value;
}

function compareText(first: string, second: string): number {
  return first === second ? 0 : first < second ? -1 : 1;
}
