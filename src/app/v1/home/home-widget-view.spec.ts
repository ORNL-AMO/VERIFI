import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { HomeWidget } from '@domain/home/home-dashboard';
import { chartWidget, homeDefinition } from '@domain/home/testing/home-fixtures';
import { homeRecord, homeSnapshot } from './testing/home-testing';
import { availableHomeCharts, homeShortcutChoices, homeWidgetView } from './home-widget-view';

describe('Home widget presentation and typed destinations', () => {
  it('keeps missing, blocked, foreign and unsupported chart links truthful without selecting replacements', () => {
    const snapshot = homeSnapshot(), widget = chartWidget('chart', 'a.with punctuation');
    const chart = { ...getNewIdbSavedVisualization(createVisualizationDefinition('Saved chart', 'account-a', { kind: 'all' }, 'utility')), guid: 'chart' };
    const record = { ...homeRecord('board'), definition: homeDefinition([widget]) };
    expect(homeWidgetView(record, widget, snapshot).state).toBe('missing-source');
    expect(homeWidgetView(record, widget, { ...snapshot, savedVisualizations: [{ ...chart, accountId: 'foreign' }] }).state).toBe('missing-source');
    expect(homeWidgetView(record, widget, { ...snapshot, savedVisualizations: [{ ...chart, recordVersion: 999 }] }).state).toBe('unsupported');
    const blocked = { ...record, preservation: { references: [{ path: 'widgets.a.with punctuation.visualizationGuid', kind: 'visualization' as const, guid: 'coincident', reason: 'not-transferred' as const }], transfers: [] } };
    expect(homeWidgetView(blocked, widget, { ...snapshot, savedVisualizations: [chart] }).state).toBe('repair-required');
    expect(availableHomeCharts({ ...snapshot, savedVisualizations: [chart, { ...chart, guid: 'locked', preservation: { locked: true, references: [], transfers: [] } }] }).map(choice => choice.guid)).toEqual(['chart']);
  });
  it('uses explicit typed owners/resources for shortcuts and refuses mismatched or arbitrary destinations', () => {
    const snapshot = homeSnapshot(), choices = homeShortcutChoices(snapshot);
    const settings = choices.find(choice => choice.destination.area === 'settings' && choice.destination.owner.kind === 'facility')!;
    expect(settings.route).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'settings', 'profile']);
    const widget: HomeWidget = { id: 'shortcut', kind: 'shortcut', size: 'half', visibility: 'always', destination: settings.destination };
    expect(homeWidgetView(homeRecord('a'), widget, snapshot).shortcut?.key).toBe(settings.key);
    expect(homeWidgetView(homeRecord('a'), { ...widget, destination: { ...settings.destination, owner: { kind: 'facility', guid: 'missing' } } }, snapshot).state).toBe('missing-source');
    expect(homeWidgetView(homeRecord('a'), { ...widget, destination: { ...settings.destination, resource: { kind: 'meter', guid: 'missing' } } }, snapshot).shortcut).toBeUndefined();
  });
  it('provides nonnumeric shells for every deferred variant while notes stay plain text', () => {
    const snapshot = homeSnapshot(), record = homeRecord('a');
    const base = { id: 'w', size: 'full' as const, visibility: 'always' as const };
    const variants: HomeWidget[] = [
      { ...base, kind: 'goal', binding: { kind: 'reporting', owner: { kind: 'account', guid: 'account-a' }, category: 'energy' } },
      { ...base, kind: 'actions', settings: { scope: 'owner' } }, { ...base, kind: 'owner-summary', settings: { scope: 'owner' } },
      { ...base, kind: 'table', settings: { view: 'utility-detail', measure: 'energy', period: 'utility-window' } }, { ...base, kind: 'map', settings: { measure: 'water' } }
    ];
    for (const widget of variants) { const view = homeWidgetView(record, widget, snapshot); expect(view.state).toBe('deferred'); expect(view.message).toContain('settings are preserved'); }
    expect(homeWidgetView(record, { ...base, kind: 'note', text: '<b>Literal</b>' }, snapshot)).toMatchObject({ state: 'ready', widget: { text: '<b>Literal</b>' } });
  });
});
