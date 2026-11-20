import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { HomeContext } from './home-context.service';
import { TestBed } from '@angular/core/testing';
import { HomeDateContext } from './home-date-context.service';
import { PreviewRegistry } from '@app/v1/visualizations/preview/preview-registry';
import { HomeBrowseSession } from './home-browse-session.service';
import { setupHome, homeRecord } from './testing/home-testing';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { homeDefinition, chartWidget } from '@domain/home/testing/home-fixtures';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { utilityCapabilities } from '@domain/visualizations/utility/utility-capabilities';
import { homeDisplayDraft, homeDisplayRaw } from './display-controls/display-controls.component';
describe('shared Home inherited latest-data anchor', () => {
  it('unions eligible histories without retargeting scopes and leaves an empty window explained', async () => {
    let empty = false;
    const resolve = vi.fn(async (definition) => ({ calendarDate: '2026-11-20', latestDataDate: empty ? undefined : definition.name === 'Lagging' ? '2024-03-31' : '2024-08-31' }));
    TestBed.overrideProvider(PreviewRegistry, { useValue: { dates: { resolve }, provider: () => ({ describe: utilityCapabilities }) } });
    const { store, snapshot } = setupHome();
    const base = utilityVisualizationFixture();
    const a = { ...base, name: 'Lagging' }, b = { ...base, name: 'Current' };
    // No resources are needed for this date-coordination boundary; provider-native date discovery is injected.
    const widgets = [chartWidget('a', 'a'), chartWidget('b', 'b')].map(widget => ({ ...widget, kind: 'visualization' as const, visualizationGuid: widget.id, inherit: ['period' as const], overrides: {} }));
    store.publish({ ...snapshot, meters: [{ ...getNewIdbUtilityMeter('facility-a', 'account-a', false, 'MMBtu'), guid: 'meter-a' }], savedVisualizations: [{ ...getNewIdbSavedVisualization(a), guid: 'a' }, { ...getNewIdbSavedVisualization(b), guid: 'b' }], homeDashboards: [{ ...homeRecord('board'), definition: homeDefinition(widgets) }] });
    const browse = TestBed.inject(HomeBrowseSession); TestBed.tick();
    browse.update(homeDisplayDraft({ ...homeDisplayRaw({}), period: 'rolling-latest' }, {}));
    expect(TestBed.inject(HomeContext).widgetShells().map(view => [view.state, view.message])).toEqual([['ready', ''], ['ready', '']]);
    const dates = TestBed.inject(HomeDateContext), definition = { ...a, period: browse.effective().period! };
    const identity = { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: 'home-a', definitionRevision: 1 };
    const result = await dates.resolve(definition, identity, new AbortController().signal);
    expect(result.latestDataDate).toBe('2024-08-31');
    expect(resolve.mock.calls.every(([definition]) => definition.facilitySelection.kind === 'all')).toBe(true);
    empty = true;
    const missing = await dates.resolve(definition, identity, new AbortController().signal);
    expect(missing.latestDataDate).toBeUndefined(); expect(missing.emptyReasons?.join()).toContain('No eligible');
  });
});
