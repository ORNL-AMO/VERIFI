import { facility } from '@app/v1/facility/data/meters/facility-meters.testing';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding, StatusEntityKind, StatusRuleCode } from '@app/v1/status/status.models';
import { PortfolioFacilityInput } from './portfolio-facility.view';
import { buildFacilitySnapshots, FacilitySnapshotNavigation } from './portfolio-facility-snapshot.view';

const navigation: FacilitySnapshotNavigation = {
  facilityDataRoute: (guid, detail) => ['/facility', guid, 'data', detail],
  facilityMeterRoute: (guid, meter, tab) => ['/facility', guid, 'meters', meter, tab],
  facilityPredictorRoute: (guid, predictor, tab) => ['/facility', guid, 'predictors', predictor, tab]
};
function finding(kind: StatusEntityKind, guid: string, severity: 'error' | 'warning', code: StatusRuleCode, facilityGuid = 'f') {
  return makeFinding(code, severity, 'quality', { kind, guid, name: guid, accountGuid: 'account', facilityGuid });
}
function input(overrides: Partial<PortfolioFacilityInput> = {}): PortfolioFacilityInput {
  return { facilities: [facility({ guid: 'f', address: '100 Industrial Drive', zip: '00501' })],
    meters: ['m1','m2','m3'].map(guid => ({ guid, facilityId: 'f' })), predictors: [{ guid: 'weather', facilityId: 'f' }],
    meterData: [], predictorData: [], equipment: [], findings: [], statusState: 'ready', ...overrides };
}
describe('facility resource snapshot', () => {
  it('counts each resource once at its highest severity and keeps findings separate from affected resources', () => {
    const snapshot = buildFacilitySnapshots(input({ findings: presentFindings([
      finding('meter', 'm1', 'error', 'meter.data.duplicate-date'),
      finding('meter', 'm1', 'error', 'meter.configuration.invalid'),
      finding('meter', 'm1', 'warning', 'meter.data.gap'),
      finding('meter', 'm2', 'warning', 'meter.currency.stale'),
      finding('predictor', 'weather', 'warning', 'predictor.weather.warning'),
      finding('facility-analysis', 'analysis', 'error', 'analysis.configuration.invalid'),
      finding('meter', 'm3', 'error', 'meter.data.missing', 'another-facility')
    ]) }), navigation).get('f')!;
    expect(snapshot.resources.map(({ total, errorCount, warningCount, validCount }) => ({ total, errorCount, warningCount, validCount }))).toEqual([
      { total: 3, errorCount: 1, warningCount: 1, validCount: 1 },
      { total: 1, errorCount: 0, warningCount: 1, validCount: 0 }
    ]);
    expect(snapshot.findings).toHaveLength(2);
    expect(snapshot.findings.map(item => item.name)).toEqual(['m1', 'm2']);
    expect(snapshot.remainingFindings).toBe(3);
    expect(snapshot.address).toBe('100 Industrial Drive, 00501');
    expect(snapshot.resources.map(resource => resource.route)).toEqual([['/facility','f','data','meters'], ['/facility','f','data','predictors']]);
  });
  it.each(['idle', 'evaluating', 'error'] as const)('keeps %s checks neutral with no stale previews or successful resource counts', state => {
    const snapshot = buildFacilitySnapshots(input({ statusState: state, findings: presentFindings([finding('meter','m1','error','meter.data.missing')]) }),navigation).get('f')!;
    expect(snapshot.evaluation).toBe(state);
    expect(snapshot.resources.map(item => [item.total,item.errorCount,item.warningCount,item.validCount])).toEqual([[3,0,0,0],[1,0,0,0]]);
    expect(snapshot.findings).toEqual([]);
    expect(snapshot.remainingFindings).toBe(0);
  });
  it('provides explicit missing address/empty inventory states and preserves facility-level setup issues', () => {
    const snapshot = buildFacilitySnapshots(input({ facilities: [facility({ guid:'f', address:'', zip:'' })], meters: [], predictors: [],
      findings: presentFindings([finding('facility','f','error','facility.predictors.missing')]) }),navigation).get('f')!;
    expect(snapshot.address).toBe('Address not set');
    expect(snapshot.resources.every(item => item.total === 0 && item.validCount === 0)).toBe(true);
    expect(snapshot.findings[0]).toMatchObject({ name:'Facility setup', action:{label:'Open predictors',route:['/facility','f','data','predictors']} });
    const postalOnly = buildFacilitySnapshots(input({facilities:[facility({guid:'f',address:'',zip:'00501'})]}),navigation).get('f')!;
    expect(postalOnly.address).toBe('ZIP / postal code 00501');
  });
  it('uses existing targeted Settings, Readings, Quality and meter-grouping destinations', () => {
    const cases = [
      [finding('meter','m1','error','meter.configuration.invalid'), ['/facility','f','meters','m1','settings']],
      [finding('meter','m1','error','meter.data.missing'), ['/facility','f','meters','m1','readings']],
      [finding('meter','m1','warning','meter.quality.cost-outlier'), ['/facility','f','meters','m1','quality']],
      [finding('predictor','weather','warning','predictor.weather.warning'), ['/facility','f','predictors','weather','readings']],
      [finding('predictor','weather','warning','predictor.quality.outlier'), ['/facility','f','predictors','weather','quality']],
      [finding('facility','f','warning','facility.meter-groups.missing'), ['/facility','f','data','meter-grouping']]
    ] as const;
    for (const [issue, route] of cases) {
      const snapshot=buildFacilitySnapshots(input({findings:presentFindings([issue])}),navigation).get('f')!;
      expect(snapshot.findings[0].action?.route).toEqual(route);
    }
  });
  it('includes saved city, state, postal code and international country in the expanded address', () => {
    const snapshots=buildFacilitySnapshots(input({facilities:[facility({guid:'f',address:'100 Industrial Drive',city:'Oak Ridge',state:'TN',zip:'00501',country:'US'}),
      facility({guid:'ca',address:'100 Rue Test',city:'Montréal',state:'Québec',zip:'H2X 1Y4',country:'CA'})]}),navigation);
    expect(snapshots.get('f')?.address).toBe('100 Industrial Drive, Oak Ridge, TN, 00501');
    expect(snapshots.get('ca')?.address).toBe('100 Rue Test, Montréal, Québec, H2X 1Y4, CA');
  });
});
