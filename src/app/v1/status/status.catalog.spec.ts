import { makeFinding } from './status.models';
import { STATUS_RULE_CODES, presentFindings, todoItems } from './status.catalog';

describe('v1 status presentation catalog', () => {
  const meterEntity = { kind: 'meter' as const, guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a' };

  it('has a presentation for every stable rule code', () => {
    expect(STATUS_RULE_CODES).toHaveLength(34);
    expect(() => STATUS_RULE_CODES.forEach(code => presentFindings([makeFinding(code, 'warning', 'quality', meterEntity)]))).not.toThrow();
  });

  it('excludes contextual outliers and informational findings from global Todos', () => {
    const findings = [
      makeFinding('meter.quality.consumption-outlier', 'warning', 'quality', meterEntity, { count: 1 }),
      makeFinding('predictor.quality.outlier', 'warning', 'quality', { ...meterEntity, kind: 'predictor' }, { count: 1, periods: ['2026-01'] }),
      makeFinding('meter.data.gap', 'error', 'completeness', meterEntity, { count: 1, periodType: 'month' }),
      makeFinding('meter.currency.stale', 'information', 'currency', meterEntity, { latestPeriod: '2026-01', thresholdMonths: 3 })
    ];
    expect(todoItems(findings).map(item => item.code)).toEqual(['meter.data.gap']);
  });

  it('routes facility and Predictor findings to their available v1 workflows', () => {
    const facilityEntity = { kind: 'facility' as const, guid: 'facility-a', name: 'Facility A', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    const predictorEntity = { ...meterEntity, kind: 'predictor' as const, guid: 'predictor-a' };

    expect(presentFindings([makeFinding('facility.predictors.missing', 'error', 'readiness', facilityEntity)])[0].destination)
      .toEqual({ kind: 'facility-data', facilityGuid: 'facility-a', detail: 'predictors' });
    expect(presentFindings([makeFinding('predictor.data.negative', 'error', 'quality', predictorEntity, { count: 1 })])[0].destination)
      .toEqual({ kind: 'predictor-tab', facilityGuid: 'facility-a', predictorGuid: 'predictor-a', tab: 'readings' });
    expect(presentFindings([makeFinding('predictor.quality.outlier', 'warning', 'quality', predictorEntity, { count: 1, periods: ['2026-01'] })])[0].destination)
      .toEqual({ kind: 'predictor-tab', facilityGuid: 'facility-a', predictorGuid: 'predictor-a', tab: 'quality' });
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
