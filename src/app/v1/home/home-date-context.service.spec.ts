import { calendarizedMeter, monthlyData, meter } from '@app/v1/data/meters/facility-meters.testing';
import { resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
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
    let empty = false, withRange = true;
    const resolve = vi.fn(async (definition) => ({ calendarDate: '2026-11-20', latestDataDate: empty ? undefined : definition.name === 'Lagging' ? '2024-03-31' : '2024-08-31', monthlyRange: withRange ? { start: '2023-04-01', end: '2024-03-31' } : undefined }));
    TestBed.overrideProvider(PreviewRegistry, { useValue: { dates: { resolve }, provider: () => ({ describe: utilityCapabilities }) } });
    const { store, snapshot } = setupHome();
    const base = utilityVisualizationFixture();
    const a = { ...base, name: 'Lagging' }, b = { ...base, name: 'Current' };
    // No resources are needed for this date-coordination boundary; provider-native date discovery is injected.
    const widgets = [chartWidget('a', 'a'), chartWidget('b', 'b')].map(widget => ({ ...widget, kind: 'visualization' as const, visualizationGuid: widget.id, inherit: ['period' as const], overrides: {} }));
    store.publish({ ...snapshot, meters: [meter({ guid: 'meter-a' })], savedVisualizations: [{ ...getNewIdbSavedVisualization(a), guid: 'a' }, { ...getNewIdbSavedVisualization(b), guid: 'b' }], homeDashboards: [{ ...homeRecord('board'), definition: homeDefinition(widgets) }] });
    const browse = TestBed.inject(HomeBrowseSession); TestBed.tick();
    browse.update(homeDisplayDraft({ ...homeDisplayRaw({}), period: 'rolling-latest' }, {}));
    expect(TestBed.inject(HomeContext).widgetShells().map(view => [view.state, view.message])).toEqual([['ready', ''], ['ready', '']]);
    const dates = TestBed.inject(HomeDateContext), definition = { ...a, period: browse.effective().period! };
    const identity = { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: 'home-a', definitionRevision: 1 };
    const result = await dates.resolve(definition, identity, new AbortController().signal);
    expect(result.latestDataDate).toBe('2024-08-31');
    expect(result.monthlyRange).toEqual({ start: '2023-09-01', end: '2024-08-31' });
    expect(resolve.mock.calls.every(([definition]) => definition.facilitySelection.kind === 'all')).toBe(true);
    withRange = false;
    const ordinary = await dates.resolve(definition, identity, new AbortController().signal);
    expect(ordinary.monthlyRange).toBeUndefined();
    const current = store.snapshot()!, source = base.sources[0] as UtilityVisualizationSource;
    const request: VisualizationSourceRequest = { identity: { ...identity, requestId: 'home-comparison', scope: resolveVisualizationFacilities(base, current.facilities).scope, sourceId: source.id },
      source, chart: base.chart!, period: browse.effective().period!, comparison: { kind: 'previous-year', basis: 'calendar' }, series: base.series, dateContext: ordinary };
    const meters = [calendarizedMeter(current.meters[0], [monthlyData({ year: 2023, monthNumValue: 0, date: new Date(2023, 0, 1), energyUse: 10 }), monthlyData({ year: 2024, monthNumValue: 0, date: new Date(2024, 0, 1), energyUse: 20 }), monthlyData({ year: 2024, monthNumValue: 7, date: new Date(2024, 7, 1), energyUse: 20 })])];
    const compared = resolveCalendarizedUtility(current, request, meters);
    expect(compared.state).toBe('ready');
    if (compared.state === 'ready') expect(compared.resolved.periods.some(period => period.role === 'comparison')).toBe(true);
    const fiscal = resolveCalendarizedUtility({ ...current, account: { ...current.account, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true } },
      { ...request, chart: { kind: 'time-series', interval: 'yearly', defaultTraceType: 'line', stack: 'none' }, period: { kind: 'rolling', unit: 'year', count: 1, basis: 'fiscal', anchor: 'latest-data', includeIncomplete: false }, comparison: { kind: 'previous-year', basis: 'fiscal' } }, meters);
    expect(fiscal.state).toBe('ready');
    if (fiscal.state === 'ready') { expect(fiscal.resolved.periods.some(period => period.role === 'comparison')).toBe(true); expect(fiscal.resolved.periods.every(period => period.basis === 'fiscal')).toBe(true); }
    empty = true; withRange = true;
    const missing = await dates.resolve(definition, identity, new AbortController().signal);
    expect(missing.latestDataDate).toBeUndefined(); expect(missing.monthlyRange).toBeUndefined(); expect(missing.emptyReasons?.join()).toContain('No eligible');
  });
});
