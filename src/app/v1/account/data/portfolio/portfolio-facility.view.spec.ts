import { IdbFacility } from '@data/models/idbModels/facility';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { PortfolioFacilityInput, buildPortfolioFacilities, filterPortfolioFacilities } from './portfolio-facility.view';

function portfolioFacility(guid: string, name: string, zip = '37830'): IdbFacility {
  return { guid, name, accountId: 'account-a', country: 'US', city: 'Oak Ridge', state: 'TN', zip, classification: 'Manufacturing' } as IdbFacility;
}

function input(overrides: Partial<PortfolioFacilityInput> = {}): PortfolioFacilityInput {
  return { facilities: [portfolioFacility('alpha', 'Alpha Plant'), portfolioFacility('beta', 'Beta Works')],
    meters: [], meterData: [], predictors: [], predictorData: [], analyses: [], reports: [], equipment: [],
    findings: [], statusState: 'ready', ...overrides };
}

describe('portfolio facility projections', () => {
  it('searches names, saved location, ZIP and classification with stable alphabetical ordering', () => {
    const views = buildPortfolioFacilities(input({ facilities: [portfolioFacility('beta', 'Beta'), { ...portfolioFacility('alpha', 'Alpha'), city: 'Memphis', classification: 'Office' }] }));
    expect(filterPortfolioFacilities(views, '', 'all', 'facilityName').map(view => view.facility.guid)).toEqual(['alpha', 'beta']);
    for (const query of ['ALPHA', 'memphis', 'office']) expect(filterPortfolioFacilities(views, query, 'all', 'facilityName').map(view => view.facility.guid)).toEqual(['alpha']);
    expect(filterPortfolioFacilities(views, '37830', 'all', 'facilityName')).toHaveLength(2);
  });

  it('includes descendant findings and distinguishes pending and unavailable checks from success', () => {
    const findings = [{ ...makeFinding('meter.data.missing', 'error', 'readiness', {
      kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'beta'
    }) }] as StatusItem[];
    const views = buildPortfolioFacilities(input({ findings }));
    expect(views.map(view => view.tone)).toEqual(['success', 'danger']);
    expect(filterPortfolioFacilities(views, '', 'attention', 'facilityName').map(view => view.facility.guid)).toEqual(['beta']);
    for (const state of ['evaluating', 'idle', 'error'] as const) {
      const pending = buildPortfolioFacilities(input({ findings, statusState: state }));
      expect(pending.every(view => view.tone === 'neutral' && view.errorCount === 0)).toBe(true);
      expect(pending[0].statusLabel).toBe(state === 'error' ? 'Checks unavailable' : 'Checks pending');
    }
  });

  it('preserves setup filters and activity sorting without exposing counts on tiles', () => {
    const views = buildPortfolioFacilities(input({ meters: [{ facilityId: 'alpha' }], analyses: [{ facilityId: 'alpha', modifiedDate: '2026-10-01' }] }));
    expect(filterPortfolioFacilities(views, '', 'noMeters', 'facilityName').map(view => view.facility.guid)).toEqual(['beta']);
    expect(filterPortfolioFacilities(views, '', 'noReadings', 'facilityName').map(view => view.facility.guid)).toEqual(['alpha']);
    expect(filterPortfolioFacilities(views, '', 'noAnalyses', 'facilityName').map(view => view.facility.guid)).toEqual(['beta']);
    expect(filterPortfolioFacilities(views, '', 'all', 'modified')[0].facility.guid).toBe('alpha');
  });

});
