import { StatusItem } from '@app/v1/status/status.models';
import { buildPredictorWorkbenchTabAttention } from './predictor-workbench.models';

describe('predictor workbench models', () => {
  it('summarizes active findings by Predictor destination tab', () => {
    const findings = [
      finding('gap', 'error', 'readings'),
      finding('weather', 'warning', 'readings'),
      finding('outlier', 'warning', 'quality'),
      { ...finding('meter', 'error', 'quality'), destination: { kind: 'meter-tab', facilityGuid: 'facility-a', meterGuid: 'meter-a', tab: 'quality' } }
    ] as StatusItem[];

    expect(buildPredictorWorkbenchTabAttention(findings)).toEqual({
      readings: { total: 2, errorCount: 1, warningCount: 1, state: 'error' },
      quality: { total: 1, errorCount: 0, warningCount: 1, state: 'warning' }
    });
  });
});

function finding(id: string, severity: 'error' | 'warning', tab: 'settings' | 'readings' | 'quality'): StatusItem {
  return {
    id,
    code: 'predictor.data.gap',
    severity,
    category: 'quality',
    entity: { kind: 'predictor', guid: 'predictor-a', name: 'Predictor', accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {},
    title: id,
    description: id,
    todo: true,
    destination: { kind: 'predictor-tab', facilityGuid: 'facility-a', predictorGuid: 'predictor-a', tab }
  };
}
