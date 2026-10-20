import { buildPredictorCards, buildWeatherStationGroups } from '../models';
import { buildPredictorInventory, filterPredictorInventory, groupPredictorInventory, predictorStatusPresentation, PredictorInventoryFilters } from './predictor-inventory.models';
import { inventoryPredictor, inventoryWorkspace } from './predictor-inventory.testing';

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
  it('keeps repair states searchable and needing attention without changing status rules', () => {
    const workspace = inventoryWorkspace(2), weather = inventoryPredictor('weather', { predictorType: 'Weather' });
    const all = buildPredictorInventory(buildPredictorCards([weather], [], []), buildWeatherStationGroups([weather], []), workspace.facility()!, 'ready');
    expect(all[0].status.label).toBe('Has warnings');
    expect(filterPredictorInventory(all, { ...filters, status: 'attention' })).toHaveLength(1);
    expect(filterPredictorInventory(all, { ...filters, search: 'station required' })).toHaveLength(1);
  });
  it.each([
    ['danger', 'ready', 'Has errors'], ['warning', 'ready', 'Has warnings'], ['success', 'ready', 'All data valid'],
    ['success', 'evaluating', 'Checks pending'], ['success', 'error', 'Checks unavailable']
  ] as const)('presents %s / %s honestly', (tone, state, label) => expect(predictorStatusPresentation(tone, state).label).toBe(label));
});
