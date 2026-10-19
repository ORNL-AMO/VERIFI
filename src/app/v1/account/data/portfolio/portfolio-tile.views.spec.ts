import { buildPortfolioFacilities, PortfolioFacilityInput } from './portfolio-facility.view';
import { buildPortfolioMeters } from './portfolio-meter.view';
import { facilityTiles, meterTiles, orderPortfolioPredictors, predictorTiles } from './portfolio-tile.views';
import { facility, meter, reading, group } from '@app/v1/facility/data/meters/facility-meters.testing';
import { inventoryNavigation, inventoryWorkspace } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.testing';
import { buildPredictorInventory } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';

const navigation = { ...inventoryNavigation, facilityMeterRoute: (facility: string, guid: string, tab: string) => ['/facility', facility, 'meters', guid, tab] };
describe('resource-specific portfolio tile facts', () => {
  it('uses saved facility location, exact resource counts and neutral evaluation state without invented facts', () => {
    const input: PortfolioFacilityInput = { facilities: [facility({ guid: 'f', city: 'Oak Ridge', state: 'TN', country: 'US' })],
      meters: [{ guid: 'm', facilityId: 'f' }, { guid: 'other', facilityId: 'other' }], predictors: [{ guid: 'p1', facilityId: 'f' }, { guid: 'p2', facilityId: 'f' }],
      meterData: [], predictorData: [], equipment: [], findings: [], statusState: 'error' };
    const tile = facilityTiles(buildPortfolioFacilities(input), input, navigation)[0];
    expect(tile.location).toBe('Oak Ridge, TN'); expect(tile.facilitySnapshot?.resources.map(item => [item.label,item.total])).toEqual([['Meters',1],['Predictors',2]]);
    expect(tile.status.label).toBe('Checks unavailable'); expect(tile.facilitySnapshot?.evaluation).toBe('error');
    expect(tile.details).toEqual([]); expect(tile.detailLink).toBeUndefined();
  });
  it('prepares meter coverage, reading units, ownership and an existing quality route', () => {
    const tiles = meterTiles(buildPortfolioMeters({ facilities: [facility({ guid: 'f' })], meters: [meter({ guid: 'm', facilityId: 'f', startingUnit: 'kWh', groupId: 'g' })],
      readings: [reading({ meterId: 'm', facilityId: 'f', year: 2024, month: 2 }), reading({ meterId: 'm', facilityId: 'f', year: 2025, month: 8 })], groups: [group({ guid: 'g', facilityId: 'f', name: 'Production' })], findings: [], statusState: 'ready' }), navigation);
    expect(tiles[0].summary).toEqual([{ label: 'Readings', value: '2' }, { label: 'First reading', value: 'Feb 2024' }, { label: 'Latest reading', value: 'Aug 2025' }]);
    expect(tiles[0].details).toContainEqual({ label: 'Units', value: 'kWh' }); expect(tiles[0].details).toContainEqual({ label: 'Group', value: 'Production' });
    expect(tiles[0].detailLink?.route).toEqual(['/facility', 'f', 'meters', 'm', 'quality']);
  });
  it('keeps weather predictors individual with station identity, units, and repair/setup access', () => {
    const workspace = inventoryWorkspace(5);
    const entries = buildPredictorInventory(workspace.predictorCards(), workspace.weatherStationGroups(), workspace.facility()!, 'ready');
    const tiles = predictorTiles(entries, navigation);
    expect(tiles).toHaveLength(5); expect(new Set(tiles.map(tile => tile.guid)).size).toBe(5);
    const weather = tiles.find(tile => tile.guid === 'p2')!;
    expect(weather.station).toBe('Chicago'); expect(weather.chip).toContain('65°F'); expect(weather.summary).toContainEqual({ label: 'Units', value: 'HDD' });
    expect(weather.detailLink?.route).toEqual(inventoryNavigation.facilityWeatherPredictorRoute('facility', 'station:KORD'));
    expect(tiles.find(tile => tile.guid === 'p1')?.detailLink?.route).toEqual(inventoryNavigation.facilityPredictorRoute('facility', 'p1', 'quality'));
  });
  it('orders individual predictor priorities and latest readings globally across duplicate facility and station names', () => {
    const workspace = inventoryWorkspace(5), all = buildPredictorInventory(workspace.predictorCards(), workspace.weatherStationGroups(), workspace.facility()!, 'ready');
    const a = { ...all[0], attentionRank: 4, card: { ...all[0].card, latestReadingSortValue: 2 } };
    const b = { ...all[1], facility: { ...all[1].facility, guid: 'b', name: 'Other' }, attentionRank: 0, card: { ...all[1].card, latestReadingSortValue: 9 } };
    expect(orderPortfolioPredictors([a,b], 'attention').map(item => item.guid)).toEqual([b.guid,a.guid]);
    expect(orderPortfolioPredictors([a,b], 'latestReading').map(item => item.guid)).toEqual([b.guid,a.guid]);
    expect(orderPortfolioPredictors([b,a], 'facilityName').map(item => item.guid)).toEqual([a.guid,b.guid]);
  });
});
