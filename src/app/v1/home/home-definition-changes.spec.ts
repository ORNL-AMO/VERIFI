import { homeDefinition, chartWidget } from '@domain/home/testing/home-fixtures';
import { homeDefinitionChanges } from './home-definition-changes';

describe('Home full-definition conflict review', () => {
  it('exposes changed links, visibility, defaults and nested widget settings even when names and titles match', () => {
    const saved = { ...homeDefinition([chartWidget('new-chart', 'same-widget')]), defaults: { emissionsTreatment: 'market' as const }, visibility: 'water' as const };
    const draft = { ...homeDefinition([{ id: 'same-widget', kind: 'visualization', size: 'half', visibility: 'always', visualizationGuid: 'old-chart', inherit: ['units'], overrides: { emissionsTreatment: 'location' } }]),
      defaults: { emissionsTreatment: 'location' as const }, visibility: 'always' as const };
    const changes = homeDefinitionChanges(saved, draft);
    expect(changes).toContainEqual({ field: 'Widget · 1 · Saved visualization identity', saved: 'new-chart', draft: 'old-chart' });
    expect(changes).toContainEqual({ field: 'Visibility', saved: 'water', draft: 'always' });
    expect(changes).toContainEqual({ field: 'Dashboard defaults · Emissions treatment', saved: 'market', draft: 'location' });
    expect(changes).toContainEqual({ field: 'Widget · 1 · Widget display overrides · Emissions treatment', saved: 'Not set', draft: 'location' });
    expect(changes.some(change => change.field.includes('Inherited dashboard settings'))).toBe(true);
  });
  it('retains source order and plain note text while showing additions/removals and no differences for equal definitions', () => {
    const saved = homeDefinition([{ id: 'n', kind: 'note', size: 'half', visibility: 'always', text: '<b>Plain</b>' }]);
    expect(homeDefinitionChanges(saved, structuredClone(saved))).toEqual([]);
    expect(homeDefinitionChanges(saved, homeDefinition())).toContainEqual({ field: 'Widget · 1 · Note text', saved: '<b>Plain</b>', draft: 'Not set' });
  });
});
