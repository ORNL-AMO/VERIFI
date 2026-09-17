import { makeFinding } from './status.models';
import { STATUS_RULE_CODES, presentFindings, todoItems } from './status.catalog';

describe('v1 status presentation catalog', () => {
  const meterEntity = { kind: 'meter' as const, guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a' };

  it('has a presentation for every stable rule code', () => {
    expect(STATUS_RULE_CODES).toHaveLength(33);
    expect(() => STATUS_RULE_CODES.forEach(code => presentFindings([makeFinding(code, 'warning', 'quality', meterEntity)]))).not.toThrow();
  });

  it('excludes contextual outliers and informational findings from global Todos', () => {
    const findings = [
      makeFinding('meter.quality.consumption-outlier', 'warning', 'quality', meterEntity, { count: 1 }),
      makeFinding('meter.data.gap', 'error', 'completeness', meterEntity, { count: 1, periodType: 'month' }),
      makeFinding('meter.currency.stale', 'information', 'currency', meterEntity, { latestPeriod: '2026-01', thresholdMonths: 3 })
    ];
    expect(todoItems(findings).map(item => item.code)).toEqual(['meter.data.gap']);
  });

  it('sorts Todos by severity, record name, and rule code', () => {
    const otherEntity = { ...meterEntity, guid: 'meter-b', name: 'Alpha meter' };
    const findings = [
      makeFinding('meter.currency.stale', 'warning', 'currency', meterEntity, { latestPeriod: '2026-01', thresholdMonths: 3 }),
      makeFinding('meter.data.negative', 'error', 'quality', meterEntity, { count: 1 }),
      makeFinding('meter.data.gap', 'error', 'completeness', otherEntity, { count: 1, periodType: 'month' })
    ];
    expect(todoItems(findings).map(item => item.code)).toEqual([
      'meter.data.gap', 'meter.data.negative', 'meter.currency.stale'
    ]);
  });
});
