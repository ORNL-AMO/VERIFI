import { TestBed } from '@angular/core/testing';
import { PreviewRegistry } from '@app/v1/visualizations/preview/preview-registry';
import { HomeChartComponent } from './home-chart.component';
import { setupHome, homeRecord } from '../testing/home-testing';
import { homeDefinition, chartWidget } from '@domain/home/testing/home-fixtures';
import { homeWidgetView } from '../home-widget-view';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';

describe('Home chart embedding context and lifetime', () => {
  it('renders built-in reporting setup without creating saved records and preserves unknown versions', () => {
    TestBed.overrideProvider(PreviewRegistry, { useValue: { provider: () => undefined, presenter: () => undefined } });
    const { store, snapshot } = setupHome();
    const widget = { id: 'energy', kind: 'built-in-chart' as const, size: 'half' as const, visibility: 'always' as const,
      reference: { kind: 'built-in' as const, recipe: 'reporting-energy-rolling', version: 1, owner: { kind: 'account' as const, guid: 'account-a' } }, inherit: [], overrides: {} };
    const record = { ...homeRecord('board'), definition: homeDefinition([widget]) };
    store.publish({ ...snapshot, homeDashboards: [record] });
    const fixture = TestBed.createComponent(HomeChartComponent);
    fixture.componentRef.setInput('view', homeWidgetView(record, widget, store.snapshot()!)); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Active for reporting');
    expect(fixture.nativeElement.textContent).toContain('Choose an Active for reporting energy analysis');
    expect(store.savedVisualizations()).toEqual([]); expect(store.homeOwners()).toEqual([]);
    const future = { ...widget, reference: { ...widget.reference, version: 99 } };
    fixture.componentRef.setInput('view', homeWidgetView(record, future, store.snapshot()!)); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('version is unavailable');
    expect(fixture.nativeElement.querySelector('app-visualization-preview')).toBeNull();
    fixture.destroy(); expect(store.savedVisualizations()).toEqual([]);
  });
  it('uses current committed linked intent and its own scope while retaining per-widget request identity', () => {
    TestBed.overrideProvider(PreviewRegistry, { useValue: { provider: () => undefined, presenter: () => undefined } });
    const { store, snapshot } = setupHome();
    const widget = chartWidget('chart'), definition = utilityVisualizationFixture();
    const chart = { ...getNewIdbSavedVisualization(definition), guid: 'chart' }, record = { ...homeRecord('board'), definition: homeDefinition([widget]) };
    store.publish({ ...snapshot, savedVisualizations: [chart], meters: [], homeDashboards: [record] });
    const fixture = TestBed.createComponent(HomeChartComponent);
    // This test isolates embedding from source availability, which has its own reference tests.
    fixture.componentRef.setInput('view', { widget, title: definition.name, state: 'ready', message: '' }); fixture.detectChanges();
    const before = fixture.componentInstance.model();
    expect(before?.state).toBe('configured');
    store.publishCommitted({ ...store.snapshot()!, savedVisualizations: [{ ...chart, revision: 2, definition: { ...definition, name: 'Committed shared edit' } }] }, {});
    fixture.detectChanges();
    const after = fixture.componentInstance.model();
    expect(after?.state === 'configured' && after.definition.name).toBe('Committed shared edit');
    expect(after?.state === 'configured' && after.identity.definitionRevision).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('committed shared edits apply here');
    const { displaySettings: _display, ...legacyBase } = definition;
    const legacy = { ...legacyBase, sources: definition.sources.map(source => ({ ...source, settings: { ...source.settings, energyTreatment: { kind: 'pinned' as const, value: 'source' as const } } })) };
    store.publishCommitted({ ...store.snapshot()!, savedVisualizations: [{ ...chart, revision: 3, definition: legacy }] }, {}); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Source energy basis');
  });
});
