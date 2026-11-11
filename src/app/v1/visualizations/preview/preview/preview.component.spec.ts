import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
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
  it('explains incomplete setup without a fabricated chart', () => {
    TestBed.configureTestingModule({ imports: [PreviewModule] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', createVisualizationDefinition('Utility setup', 'account-a', { kind: 'portfolio' }, 'utility'));
    fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Complete source and chart setup');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('announces missing adapters while preserving configured sources', () => {
    TestBed.configureTestingModule({ imports: [PreviewModule] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', utilityVisualizationFixture()); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('not available yet');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('mounts the registered presenter with an accessible table after evidence checks', async () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    TestBed.configureTestingModule({ imports: [PreviewModule, RendererFixtureComponent], providers: [
      { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: [{ kind: 'utility', describe: () => evidence.capabilities,
        supportsChart: () => evidence.chartSupport, resolve: async request => ({ ...evidence.resolution, identity: request.identity }) }] },
      { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [{ kind: 'time-series', component: RendererFixtureComponent,
        prepare: () => ({ inputs: { text: 'Current utility preview' }, details: { caption: 'Energy in kWh', columns: ['Period', 'Energy'], rows: [['January 2025', '0']] } }) }] },
      { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: async () => ({ calendarDate: '2026-11-11' }) } }
    ] });
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', definition); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
    await settle(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Current utility preview');
    expect(fixture.nativeElement.querySelector('summary').textContent).toBe('Underlying values');
    expect(fixture.nativeElement.querySelector('caption').textContent).toBe('Energy in kWh');
    expect(fixture.nativeElement.querySelectorAll('th[scope="col"]').length).toBe(2);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('0');
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
    const button = fixture.nativeElement.querySelector('button'); expect(button.textContent).toContain('Retry preview');
    button.click(); await settle(); fixture.detectChanges(); expect(resolve).toHaveBeenCalledTimes(2);
  });
});
