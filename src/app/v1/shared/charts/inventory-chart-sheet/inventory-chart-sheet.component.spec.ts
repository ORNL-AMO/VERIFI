import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MeterResultsChartComponent } from '../metric-results-chart/meter-results-chart.component';
import { InventoryChartSheetComponent } from './inventory-chart-sheet.component';

function setup() {
  TestBed.configureTestingModule({ imports: [InventoryChartSheetComponent] });
  const fixture = TestBed.createComponent(InventoryChartSheetComponent);
  fixture.componentRef.setInput('facilityName', 'Main facility');
  const metrics = Array.from({ length: 10 }, (_, index) => ({ id: `m${index}`, label: `Meter ${index}`, unit: 'kWh', color: 'var(--v1-chart-series-1)', lineStyle: index ? [8, 4] : 'solid' }));
  fixture.componentRef.setInput('charts', [
    { id: 'energy', title: 'Energy', unit: 'kWh', coverage: 'No monthly data', metrics, rows: [] },
    { id: 'cost', title: 'Cost', unit: 'USD', coverage: 'No monthly data', metrics, rows: [] }
  ]);
  fixture.componentRef.setInput('view', { metric: 'energy', hiddenGuids: [], tracePanelOpen: true });
  fixture.componentRef.setInput('state', 'ready');
  fixture.componentInstance.viewChanged.subscribe(view => fixture.componentRef.setInput('view', view));
  fixture.detectChanges(); return fixture;
}

describe('inventory chart sheet', () => {
  it('selects single Predictor histories through the trace panel without inheriting multi-trace exclusions', () => {
    const fixture = setup(), component = fixture.componentInstance, zoom = vi.fn();
    fixture.componentRef.setInput('resource', 'predictors'); fixture.componentRef.setInput('singleTrace', true);
    fixture.componentRef.setInput('charts', ['p1', 'p2'].map(id => ({ id, title: id, unit: 'tons', coverage: 'Jan 2025', metrics: [{ id, label: id }], rows: [] })));
    fixture.componentRef.setInput('view', { metric: 'deleted', hiddenGuids: ['p1', 'p2'], tracePanelOpen: true }); component.zoomChanged.subscribe(zoom); fixture.detectChanges();
    expect(component.activeChart()?.id).toBe('p1'); expect(component.visibleMetrics().map(trace => trace.id)).toEqual(['p1']);
    expect(fixture.nativeElement.querySelector('[aria-label="Chart metric"]')).toBeNull();
    const radio = fixture.nativeElement.querySelector('input[aria-label="Show p2"]') as HTMLInputElement;
    radio.click(); fixture.detectChanges(); expect(component.activeChart()?.id).toBe('p2');
    expect(component.traceVisibleCount()).toBe(1); expect(component.traceChoices()).toHaveLength(2);
    expect(zoom).toHaveBeenCalledWith({ start: 0, end: 100 });
    expect(fixture.nativeElement.textContent).toContain('No monthly p2 data');
    fixture.componentRef.setInput('charts', [component.charts()[0]]); fixture.detectChanges(); expect(component.activeChart()?.id).toBe('p1');
    fixture.destroy();
  });
  it('shows all GUID traces without paging and preserves visibility and zoom between Meter metrics', () => {
    const fixture = setup(), component = fixture.componentInstance, zoom = vi.fn();
    component.zoomChanged.subscribe(zoom);
    fixture.componentRef.setInput('zoomRange', { start: 20, end: 80 }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.chart-traces__row')).toHaveLength(10);
    const first = fixture.nativeElement.querySelector('input[aria-label="Show Meter 0"]') as HTMLInputElement;
    first.click(); fixture.detectChanges();
    expect(component.visibleMetrics().map(item => item.id)).not.toContain('m0');
    expect(component.traceVisibleCount()).toBe(9);
    const buttons = fixture.nativeElement.querySelectorAll('[aria-label="Chart metric"] button') as NodeListOf<HTMLButtonElement>;
    [...buttons].find(button => button.textContent.trim() === 'Cost')!.click(); fixture.detectChanges();
    expect(component.activeChart()?.id).toBe('cost');
    expect(component.visibleMetrics()).toHaveLength(9);
    expect(component.view().hiddenGuids).toEqual(['m0']);
    expect(component.zoomRange()).toEqual({ start: 20, end: 80 });
    expect(zoom).not.toHaveBeenCalled();
    expect((fixture.nativeElement.querySelector('input[aria-label="Show Meter 0"]') as HTMLInputElement).checked).toBe(false);
    fixture.destroy();
  });
  it('explains hidden traces, disables downloading, and restores all traces through the shared panel', () => {
    const fixture = setup(), component = fixture.componentInstance;
    const all = fixture.nativeElement.querySelector('.chart-traces__all input') as HTMLInputElement;
    all.click(); fixture.detectChanges();
    expect(component.visibleMetrics()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No traces visible');
    expect(fixture.nativeElement.querySelector('[aria-label="Download chart"]').disabled).toBe(true);
    all.click(); fixture.detectChanges();
    expect(component.visibleMetrics()).toHaveLength(10);
    expect(fixture.nativeElement.querySelector('[aria-label="Download chart"]').disabled).toBe(false);
    fixture.destroy();
  });
  it('keeps loading and failures explicit without inventing chart data and emits shared zoom', () => {
    const fixture = setup(), component = fixture.componentInstance, zoom = vi.fn(); component.zoomChanged.subscribe(zoom);
    component.zoom(.6); expect(zoom).toHaveBeenCalledWith({ start: 20, end: 80 });
    fixture.componentRef.setInput('state', 'loading'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Preparing data');
    fixture.componentRef.setInput('state', 'error'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Unavailable');
    fixture.destroy();
  });
  it.each(['energy', 'water', 'cost'])('automatically displays the sole %s chart without metric toggles', metric => {
    const fixture = setup(), component = fixture.componentInstance;
    component.chooseMetric('cost'); fixture.detectChanges();
    const chart = { ...component.charts()[0], id: metric, title: metric[0].toUpperCase() + metric.slice(1) };
    fixture.componentRef.setInput('charts', [chart]); fixture.detectChanges();
    expect(component.activeChart()?.id).toBe(metric);
    expect(fixture.nativeElement.querySelector('[aria-label="Chart metric"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.inventory-chart-sheet__coverage')?.textContent).toContain(chart.title);
    fixture.componentRef.setInput('charts', [chart, { ...chart, id: 'other', title: 'Other' }]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Chart metric"]')?.querySelectorAll('button')).toHaveLength(2);
    component.updateView({ hiddenGuids: chart.metrics.map(item => item.id) }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Chart metric"]')?.querySelectorAll('button')).toHaveLength(2);
    fixture.destroy();
  });
  it('distinguishes loading, failed and empty data when no metrics are available', () => {
    const fixture = setup(); fixture.componentRef.setInput('charts', []);
    for (const state of ['idle', 'loading', 'error', 'ready'] as const) {
      fixture.componentRef.setInput('state', state); fixture.detectChanges();
      const status = fixture.nativeElement.querySelector('[role="status"]')?.textContent;
      expect(status).toContain(state === 'idle' || state === 'loading' ? 'Preparing data' : state === 'error' ? 'Unavailable' : 'No charts are available');
      expect(fixture.nativeElement.querySelector('[aria-label="Chart metric"]')).toBeNull();
    }
    fixture.destroy();
  });
  it('keeps the headerless sheet modeless and draws straight lines with point symbols only for Predictors', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.workspace-bottom-sheet__header')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-label')).toBe('Main facility · Monthly data');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
    expect(dialog.hasAttribute('aria-modal')).toBe(false);
    const renderer = fixture.debugElement.query(By.directive(MeterResultsChartComponent)).componentInstance as MeterResultsChartComponent;
    expect(renderer.smoothLines).toBe(false); expect(renderer.showPointSymbols).toBe(false);
    fixture.componentRef.setInput('resource', 'predictors'); fixture.detectChanges();
    expect(renderer.smoothLines).toBe(false); expect(renderer.showPointSymbols).toBe(true);
    fixture.destroy();
  });
  it('clears highlighting when the context, metric, or trace panel changes', () => {
    const fixture = setup(), component = fixture.componentInstance;
    component.highlightedTrace.set('m0');
    fixture.componentRef.setInput('contextKey', 'next-facility'); fixture.detectChanges();
    expect(component.highlightedTrace()).toBeUndefined();
    component.highlightedTrace.set('m1'); component.chooseMetric('cost'); fixture.detectChanges();
    expect(component.highlightedTrace()).toBeUndefined();
    component.highlightedTrace.set('m2'); component.toggleTracePanel(); fixture.detectChanges();
    expect(component.highlightedTrace()).toBeUndefined(); expect(component.tracePanelOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-chart-trace-panel')).toBeNull();
    fixture.destroy();
  });
  it('waits for slide-down completion before removing the sheet and closes immediately for reduced motion', () => {
    vi.useFakeTimers(); const fixture = setup(), closed = vi.fn(), component = fixture.componentInstance;
    component.closed.subscribe(closed); component.requestClose(); fixture.detectChanges();
    expect(component.closing()).toBe(true); expect(closed).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.inventory-chart-sheet--closing')).not.toBeNull();
    vi.advanceTimersByTime(360); expect(closed).toHaveBeenCalledTimes(1);
    fixture.destroy(); vi.useRealTimers(); TestBed.resetTestingModule();
    const reduced = setup(), reducedClosed = vi.fn(); reduced.componentInstance.closed.subscribe(reducedClosed);
    const original = window.matchMedia;
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    try { reduced.componentInstance.requestClose(); expect(reducedClosed).toHaveBeenCalledTimes(1); expect(reduced.componentInstance.closing()).toBe(false); }
    finally { window.matchMedia = original; reduced.destroy(); }
  });
});
