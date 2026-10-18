import { buildPredictorCards, buildWeatherStationGroups } from '../models';
import { buildPredictorInventory, filterPredictorInventory, groupPortfolioPredictors, groupPredictorInventory, buildPredictorPreviewRows, predictorStatusPresentation, PredictorInventoryFilters } from './predictor-inventory.models';
import { inventoryPredictor, inventoryReading, inventoryWorkspace } from './predictor-inventory.testing';

const filters: PredictorInventoryFilters = { search: '', type: 'all', status: 'all', sort: 'attention' };
function entries() { const workspace = inventoryWorkspace(5); return buildPredictorInventory(workspace.predictorCards(), workspace.weatherStationGroups(), workspace.facility()!, 'ready'); }
describe('Predictor inventory projections', () => {
  it('keeps individual weather search from exposing nonmatching siblings and retains station search', () => {
    const all = entries();
    expect(filterPredictorInventory(all, { ...filters, search: 'p2' }).map(item => item.guid)).toEqual(['p2']);
    expect(filterPredictorInventory(all, { ...filters, search: 'chicago', type: 'weather' }).map(item => item.guid)).toEqual(['p2', 'p5']);
    expect(filterPredictorInventory(all, { ...filters, search: 'p2', type: 'standard' })).toHaveLength(0);
    expect(groupPredictorInventory(all, 'predictorName').find(item => item.station)?.entries).toHaveLength(2);
  });
  it('preserves duplicate names and separates the same station across facilities', () => {
    const all = entries().map(entry => ({ ...entry, card: { ...entry.card, predictor: { ...entry.card.predictor, name: 'Same' } } }));
    const other = all.map(entry => ({ ...entry, guid: 'other-' + entry.guid, facility: { ...entry.facility, guid: 'other', name: 'Other' } }));
    for (const sort of ['attention', 'facilityName', 'latestReading'] as const) {
      const groups = groupPortfolioPredictors([...all, ...other], sort);
      expect(groups.map(item => item.facility.guid)).toEqual(['facility', 'other']);
      expect(groups.flatMap(item => item.entries)).toHaveLength(10);
    }
  });
  it('keeps repair states searchable and needing attention without changing status rules', () => {
    const workspace = inventoryWorkspace(2), weather = inventoryPredictor('weather', { predictorType: 'Weather' });
    const all = buildPredictorInventory(buildPredictorCards([weather], [], []), buildWeatherStationGroups([weather], []), workspace.facility()!, 'ready');
    expect(all[0].status.label).toBe('Has warnings');
    expect(filterPredictorInventory(all, { ...filters, status: 'attention' })).toHaveLength(1);
    expect(filterPredictorInventory(all, { ...filters, search: 'station required' })).toHaveLength(1);
  });
  it.each([
    ['danger', 'ready', 'Has errors'], ['warning', 'ready', 'Has warnings'], ['success', 'ready', 'No active findings'],
    ['success', 'evaluating', 'Checks pending'], ['success', 'error', 'Checks unavailable']
  ] as const)('presents %s / %s honestly', (tone, state, label) => expect(predictorStatusPresentation(tone, state).label).toBe(label));
  it('retains zeros, negative and duplicate readings and inserts gaps without aggregation', () => {
    const entry = entries()[0];
    const rows = buildPredictorPreviewRows(entry, [inventoryReading(entry.guid, { guid: 'a', amount: 0 }), inventoryReading(entry.guid, { guid: 'b', amount: -5 }), inventoryReading(entry.guid, { guid: 'c', month: 4, amount: 7 }), inventoryReading(entry.guid, { guid: 'invalid', month: 99 })]);
    expect(rows.map(item => item.values['value'])).toEqual([0, -5, null, null, 7]);
    expect(rows.map(item => item.periodKey)).toEqual(['a', 'b', expect.stringMatching(/^gap-/), expect.stringMatching(/^gap-/), 'c']);
    expect(buildPredictorPreviewRows(undefined, [])).toEqual([]);
  });
});
