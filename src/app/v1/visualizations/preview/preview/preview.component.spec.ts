import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { visualizationSnapshot } from '../../testing/visualization-test-fixtures';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createVisualizationDefinition, createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import { PreviewModule } from '../preview.module';
import { PreviewIdentity, VISUALIZATION_DATE_CONTEXT_RESOLVER, VISUALIZATION_PREVIEW_PRESENTERS, VISUALIZATION_SOURCE_PROVIDERS } from '../preview-registry';
import { PreviewComponent } from './preview.component';

@Component({ selector: 'app-preview-renderer-fixture', template: '<p>{{ text }}</p>' })
class RendererFixtureComponent { @Input() text = ''; }

const identity: PreviewIdentity = { accountGuid: 'account-a', definitionGuid: 'visualization-a', definitionRevision: 1, workspaceRevision: 1 };
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

describe('visualization preview presentation', () => {
  beforeEach(() => { const store = new AccountWorkspaceStore(); store.publish(visualizationSnapshot());
    TestBed.configureTestingModule({ providers: [{ provide: AccountWorkspaceStore, useValue: store }] }); });
  it('retains source evidence without rendering a table or changing saved intent', async () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    const rows = Array.from({ length: 130 }, (_, index) => [`Observation ${index}`, String(index)]);
    TestBed.configureTestingModule({ imports: [PreviewModule, RendererFixtureComponent], providers: [
      { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: [{ kind: 'utility', describe: () => evidence.capabilities,
        supportsChart: () => evidence.chartSupport, resolve: async request => ({ ...evidence.resolution, identity: request.identity }) }] },
      { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [{ kind: 'time-series', component: RendererFixtureComponent,
        prepare: () => ({ inputs: {}, details: { caption: 'Dense source values', columns: ['Period', 'Value'], rows } }) }] },
      { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: async () => ({ calendarDate: '2026-11-12' }) } }
    ] });
    const fixture = TestBed.createComponent(PreviewComponent), before = structuredClone(definition);
    fixture.componentRef.setInput('definition', definition); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    await settle(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('table, details, nav')).toBeNull();
    const state = fixture.componentInstance.preview.state();
    expect(state.state).toBe('ready');
    if (state.state === 'ready') expect(state.presentation.details.rows).toEqual(rows);
    expect(definition).toEqual(before);
    fixture.destroy();
  });
  it('explains incomplete setup without a fabricated chart', () => {
    TestBed.configureTestingModule({ imports: [PreviewModule] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', createVisualizationDefinition('Utility setup', 'account-a', { kind: 'all' }, 'utility'));
    fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Complete source and chart setup');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('announces missing adapters while preserving configured sources', () => {
    TestBed.configureTestingModule({ imports: [PreviewModule] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', utilityVisualizationFixture()); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('not supported yet');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('announces the selected Scatter setup for multiple data sources without mounting chart data', () => {
    TestBed.configureTestingModule({ imports: [PreviewModule] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', createVisualizationSetupDefinition({ name: 'Usage versus temperature', accountGuid: 'account-a',
      facilitySelection: { kind: 'all' }, chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] }));
    fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Scatter visualization');
    expect(root.textContent).toContain('Choose declared X and Y series.');
    expect(root.querySelector('table')).toBeNull(); expect(root.querySelector('button')).toBeNull();
  });

  it('mounts only the registered presenter after evidence checks', async () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    TestBed.configureTestingModule({ imports: [PreviewModule, RendererFixtureComponent], providers: [
      { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: [{ kind: 'utility', describe: () => evidence.capabilities,
        supportsChart: () => evidence.chartSupport, resolve: async request => ({ ...evidence.resolution, identity: request.identity }) }] },
      { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [{ kind: 'time-series', component: RendererFixtureComponent,
        prepare: () => ({ inputs: { text: 'Current utility chart' }, details: { caption: 'Energy in kWh', columns: ['Period', 'Energy'], rows: [['January 2025', '0']] } }) }] },
      { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: async () => ({ calendarDate: '2026-11-11' }) } }
    ] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', definition); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    await settle(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Current utility chart');
    expect(fixture.nativeElement.querySelector('table, details')).toBeNull();
    fixture.componentRef.setInput('active', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-preview-renderer-fixture')).toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('offers an actionable retry for calculation failure', async () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    const resolve = vi.fn(async request => ({ state: 'error', identity: request.identity, message: 'Calculation failed.' }));
    TestBed.configureTestingModule({ imports: [PreviewModule], providers: [
      { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: [{ kind: 'utility', describe: () => evidence.capabilities, supportsChart: () => evidence.chartSupport, resolve }] },
      { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [{ kind: 'time-series', component: RendererFixtureComponent, prepare: vi.fn() }] },
      { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: async () => ({ calendarDate: '2026-11-11' }) } }
    ] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', definition); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    await settle(); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button'); expect(button.textContent).toContain('Retry chart');
    button.click(); await settle(); fixture.detectChanges(); expect(resolve).toHaveBeenCalledTimes(2);
  });
});
