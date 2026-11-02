import { IdbFacility } from '@data/models/idbModels/facility';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { facilityTiles } from '@app/v1/data/inventory/data-inventory-tiles.view';
import { FacilityInventoryInput, buildFacilityInventory, filterFacilityInventory } from './facility-inventory.view';

function portfolioFacility(guid: string, name: string, zip = '37830'): IdbFacility {
  return { guid, name, accountId: 'account-a', country: 'US', city: 'Oak Ridge', state: 'TN', zip, classification: 'Manufacturing' } as IdbFacility;
}

function input(overrides: Partial<FacilityInventoryInput> = {}): FacilityInventoryInput {
  return { facilities: [portfolioFacility('alpha', 'Alpha Plant'), portfolioFacility('beta', 'Beta Works')],
    meters: [], meterData: [], predictors: [], predictorData: [], equipment: [],
    findings: [], statusState: 'ready', ...overrides };
}

describe('portfolio facility projections', () => {
  it('excludes analysis and report issues from Data status, attention filters, counts and inline findings', () => {
    const findings = presentFindings([
      makeFinding('analysis.configuration.invalid', 'error', 'configuration', { kind: 'facility-analysis', guid: 'analysis', name: 'Analysis', accountGuid: 'account-a', facilityGuid: 'alpha' }),
      makeFinding('analysis-group.setup.invalid', 'warning', 'configuration', { kind: 'analysis-group', guid: 'group', name: 'Group', accountGuid: 'account-a', facilityGuid: 'beta' }),
      makeFinding('report.configuration.invalid', 'error', 'configuration', { kind: 'facility-report', guid: 'report', name: 'Report', accountGuid: 'account-a', facilityGuid: 'beta' }),
      makeFinding('predictor.data.missing', 'warning', 'completeness', { kind: 'predictor', guid: 'predictor', name: 'Production', accountGuid: 'account-a', facilityGuid: 'beta' })
    ]);
    const source = input({ findings });
    const views = buildFacilityInventory(source);
    expect(views.map(view => [view.statusLabel, view.errorCount, view.warningCount])).toEqual([['All data valid', 0, 0], ['Has warnings', 0, 1]]);
    expect(filterFacilityInventory(views, '', 'error', 'attention')).toEqual([]);
    expect(filterFacilityInventory(views, '', 'attention', 'attention').map(view => view.facility.guid)).toEqual(['beta']);
    const tiles = facilityTiles(views, source, {
      facilityInventoryLink: (guid, resource) => ({ route: ['/account', 'data', resource], queryParams: { facility: guid } }),
      facilityDataToolRoute: (guid, detail) => ['/facility', guid, 'data', detail],
      facilityMeterRoute: (guid, meter, tab) => ['/facility', guid, 'meters', meter, tab],
      facilityPredictorRoute: (guid, predictor, tab) => ['/facility', guid, 'predictors', predictor, tab]
    });
    expect(tiles[0].facilitySnapshot?.findings).toEqual([]);
    expect(tiles[1].facilitySnapshot?.findings.map(item => item.description)).toEqual([findings[3].description]);
    expect(tiles[0].facilitySnapshot?.resources.map(item => item.kind)).toEqual(['meters','predictors']);
  });
  it('searches names, saved location, ZIP and classification with stable alphabetical ordering', () => {
    const views = buildFacilityInventory(input({ facilities: [portfolioFacility('beta', 'Beta'), { ...portfolioFacility('alpha', 'Alpha'), city: 'Memphis', classification: 'Office' }] }));
    expect(filterFacilityInventory(views, '', 'all', 'facilityName').map(view => view.facility.guid)).toEqual(['alpha', 'beta']);
    for (const query of ['ALPHA', 'memphis', 'office']) expect(filterFacilityInventory(views, query, 'all', 'facilityName').map(view => view.facility.guid)).toEqual(['alpha']);
    expect(filterFacilityInventory(views, '37830', 'all', 'facilityName')).toHaveLength(2);
  });

  it('includes descendant findings and distinguishes pending and unavailable checks from success', () => {
    const findings = [{ ...makeFinding('meter.data.missing', 'error', 'readiness', {
      kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'beta'
    }) }] as StatusItem[];
    const views = buildFacilityInventory(input({ findings }));
    expect(views.map(view => view.tone)).toEqual(['success', 'danger']);
    expect(filterFacilityInventory(views, '', 'attention', 'facilityName').map(view => view.facility.guid)).toEqual(['beta']);
    for (const state of ['evaluating', 'idle', 'error'] as const) {
      const pending = buildFacilityInventory(input({ findings, statusState: state }));
      expect(pending.every(view => view.tone === 'neutral' && view.errorCount === 0)).toBe(true);
      expect(pending[0].statusLabel).toBe(state === 'error' ? 'Checks unavailable' : 'Checks pending');
    }
  });

  it('preserves setup filters and activity sorting without exposing counts on tiles', () => {
    const views = buildFacilityInventory(input({ meters: [{ guid:'m', facilityId: 'alpha' }], meterData: [{ facilityId: 'alpha', modifiedDate: '2026-10-01' }] }));
    expect(filterFacilityInventory(views, '', 'noMeters', 'facilityName').map(view => view.facility.guid)).toEqual(['beta']);
    expect(filterFacilityInventory(views, '', 'noReadings', 'facilityName')).toEqual([]);
    expect(filterFacilityInventory(views, '', 'all', 'modified')[0].facility.guid).toBe('alpha');
  });

});
