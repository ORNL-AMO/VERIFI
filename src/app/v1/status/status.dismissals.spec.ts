import { StatusWarningDismissal } from '@data/models/status-warning-dismissal';
import {
  createStatusWarningDismissal,
  partitionStatusFindings,
  statusFindingEvidenceSignature,
  summarizeStatusAttention
} from './status.dismissals';
import { makeFinding } from './status.models';

describe('v1 status warning dismissals', () => {
  const entity = {
    kind: 'meter' as const,
    guid: 'meter-a',
    name: 'Meter A',
    accountGuid: 'account-a',
    facilityGuid: 'facility-a'
  };

  it('creates a stable signature from ordered evidence keys and values', () => {
    const first = makeFinding('meter.data.gap', 'warning', 'completeness', entity, {
      dates: ['2026-03', '2026-01'],
      count: 2
    });
    const reordered = makeFinding('meter.data.gap', 'warning', 'completeness', entity, {
      count: 2,
      dates: ['2026-01', '2026-03']
    });

    expect(statusFindingEvidenceSignature(first)).toBe(statusFindingEvidenceSignature(reordered));
  });

  it('hides only a warning with the matching current evidence', () => {
    const warning = makeFinding('meter.currency.stale', 'warning', 'currency', entity, {
      latestPeriod: '2026-01', thresholdMonths: 3
    });
    const error = makeFinding('meter.data.gap', 'error', 'completeness', entity, { count: 1 });
    const dismissal = createStatusWarningDismissal(warning, '2026-09-18T12:00:00.000Z');

    expect(partitionStatusFindings([warning, error], [dismissal])).toEqual({
      active: [error],
      discarded: [warning]
    });

    const changed = { ...warning, evidence: { ...warning.evidence, latestPeriod: '2026-02' } };
    expect(partitionStatusFindings([changed], [dismissal])).toEqual({ active: [changed], discarded: [] });
  });

  it('never discards errors or information even if a matching record is stored', () => {
    const error = makeFinding('meter.data.gap', 'error', 'completeness', entity, { count: 1 });
    const information = makeFinding('meter.currency.stale', 'information', 'currency', entity, { latestPeriod: '2026-01' });
    const records: StatusWarningDismissal[] = [error, information].map(finding => ({
      findingId: finding.id,
      evidenceSignature: statusFindingEvidenceSignature(finding),
      discardedAt: '2026-09-18T12:00:00.000Z'
    }));

    expect(partitionStatusFindings([error, information], records).active).toEqual([error, information]);
    expect(() => createStatusWarningDismissal(error, '2026-09-18T12:00:00.000Z')).toThrow('Only warning');
  });

  it('summarizes actionable attention with error precedence', () => {
    const findings = [
      makeFinding('meter.data.gap', 'error', 'completeness', entity),
      makeFinding('meter.currency.stale', 'warning', 'currency', entity),
      makeFinding('meter.quality.cost-outlier', 'information', 'quality', entity)
    ];

    expect(summarizeStatusAttention(findings)).toEqual({
      total: 2,
      errorCount: 1,
      warningCount: 1,
      state: 'error'
    });
  });
});
