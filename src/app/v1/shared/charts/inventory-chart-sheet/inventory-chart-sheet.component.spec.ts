import { TestBed } from '@angular/core/testing';
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
  fixture.componentRef.setInput('state', 'ready');
  fixture.componentInstance.viewChanged.subscribe(view => fixture.componentRef.setInput('view', view));
  fixture.detectChanges(); return fixture;
}

describe('meter chart sheet', () => {
  it('selects single Predictor histories through the trace panel without inheriting multi-trace exclusions', () => {
    const fixture = setup(), component = fixture.componentInstance, zoom = vi.fn();
    fixture.componentRef.setInput('resource', 'predictors'); fixture.componentRef.setInput('traceBrowser', true); fixture.componentRef.setInput('singleTrace', true);
    fixture.componentRef.setInput('charts', ['p1', 'p2'].map(id => ({ id, title: id, unit: 'tons', coverage: 'Jan 2025', metrics: [{ id, label: id }], rows: [] })));
    fixture.componentRef.setInput('view', { metric: 'deleted', hiddenGuids: ['p1', 'p2'], legendPage: 0 }); component.zoomChanged.subscribe(zoom); fixture.detectChanges();
    expect(component.activeChart()?.id).toBe('p1'); expect(component.visibleMetrics().map(trace => trace.id)).toEqual(['p1']);
    expect(fixture.nativeElement.querySelector('[aria-label="Chart metric"]')).toBeNull();
    const radio = fixture.nativeElement.querySelector('input[aria-label="Show p2"]') as HTMLInputElement;
    radio.click(); fixture.detectChanges(); expect(component.activeChart()?.id).toBe('p2');
    expect(component.traceVisibleCount()).toBe(1); expect(component.traceChoices()).toHaveLength(2);
    expect(zoom).toHaveBeenCalledWith({ start: 0, end: 100 });
    fixture.componentRef.setInput('charts', [component.charts()[0]]); fixture.detectChanges(); expect(component.activeChart()?.id).toBe('p1');
    fixture.destroy();
  });
  it('toggles independent GUID traces, pages legend chips, and preserves visibility between metrics', () => {
    const fixture = setup(), component = fixture.componentInstance;
    expect(component.legendEntries()).toHaveLength(8); expect(component.legendPages()).toBe(2);
    component.toggleTrace('m0'); fixture.detectChanges();
    expect(component.visibleMetrics().map(item => item.id)).not.toContain('m0');
    expect(component.legendEntries()[0].visible).toBe(false);
    component.updateView({ legendPage: 1 }); fixture.detectChanges(); expect(component.legendEntries()).toHaveLength(2);
    component.chooseMetric('cost'); fixture.detectChanges(); expect(component.legendPage()).toBe(0);
    expect(component.visibleMetrics()).toHaveLength(9);
    for (const metric of component.visibleMetrics()) { component.toggleTrace(metric.id); fixture.detectChanges(); } fixture.detectChanges(); expect(component.visibleMetrics()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No meters selected');
    for (let i = 0; i < 10; i++) { component.toggleTrace(`m${i}`); fixture.detectChanges(); } fixture.detectChanges(); expect(component.visibleMetrics()).toHaveLength(10);
    fixture.componentRef.setInput('charts', []); fixture.detectChanges(); expect(component.activeChart()).toBeUndefined();
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
  it('searches and pages saved histories, clamps removed pages, and resets searches for a new scope', () => {
    const fixture = setup(), component = fixture.componentInstance;
    fixture.componentRef.setInput('searchableCharts', true);
    fixture.componentRef.setInput('charts', Array.from({ length: 18 }, (_, index) => ({ id: `p${index}`, title: `Plant / Predictor ${index}`, unit: 'tons', coverage: '', metrics: [], rows: [] })));
    fixture.detectChanges(); expect(component.visibleCharts()).toHaveLength(8);
    component.changeChartPage(2); fixture.detectChanges();
    expect(component.visibleCharts()).toHaveLength(2); expect(component.activeChart()?.id).toBe('p16');
    component.chartSearch.setValue(' Predictor 17 '); fixture.detectChanges();
    expect(component.visibleCharts().map(chart => chart.id)).toEqual(['p17']);
    expect(component.chartPage()).toBe(0); expect(component.activeChart()?.id).toBe('p17');
    component.chartSearch.setValue('missing'); fixture.detectChanges();
    expect(component.activeChart()).toBeUndefined(); expect(fixture.nativeElement.textContent).toContain('No predictor charts match');
    fixture.componentRef.setInput('contextKey', 'next-facility'); fixture.detectChanges();
    expect(component.chartSearch.value).toBe(''); expect(component.visibleCharts()).toHaveLength(8);
    component.changeChartPage(2); fixture.detectChanges();
    fixture.componentRef.setInput('charts', [{ id: 'only', title: 'Only history', unit: '', coverage: '', metrics: [], rows: [] }]); fixture.detectChanges();
    expect(component.chartPage()).toBe(0); expect(component.visibleCharts()).toHaveLength(1);
    fixture.destroy();
  });
  it('searches series without changing the plotted source or its visibility', () => {
    const fixture = setup(), component = fixture.componentInstance;
    component.traceSearch.setValue('meter 9'); fixture.detectChanges();
    expect(component.legendEntries().map(metric => metric.id)).toEqual(['m9']);
    expect(component.visibleMetrics()).toHaveLength(10);
    fixture.destroy();
  });
  it('removes the visible heading and series search while retaining an accessible name and unfiltered legend', () => {
    const fixture = setup(), component = fixture.componentInstance;
    component.traceSearch.setValue('meter 9'); fixture.detectChanges();
    fixture.componentRef.setInput('showHeader', false); fixture.componentRef.setInput('showSeriesSearch', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.workspace-bottom-sheet__header')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[aria-label="Find chart series"]')).toBeNull();
    expect(component.legendEntries()).toHaveLength(8); expect(component.legendPages()).toBe(2);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-label')).toBe('Main facility · Monthly data');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
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
  it('supports individual Predictor tabs with arrow/Home/End navigation, full-history reset, and no trace legend', () => {
    const fixture = setup(), component = fixture.componentInstance, zoom = vi.fn();
    fixture.componentRef.setInput('resource', 'predictors'); fixture.componentRef.setInput('scrollableTabs', true);
    fixture.componentRef.setInput('showTraceControls', false); component.zoomChanged.subscribe(zoom); fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    expect(tabs).toHaveLength(2); expect(tabs[0].getAttribute('tabindex')).toBe('0'); expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); fixture.detectChanges();
    expect(component.activeChart()?.id).toBe('cost'); expect(zoom).toHaveBeenCalledWith({ start: 0, end: 100 });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); fixture.detectChanges();
    expect(component.activeChart()?.id).toBe('energy'); expect(fixture.nativeElement.querySelector('.inventory-chart-sheet__legend')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(tabs[0].id);
    fixture.destroy();
  });
});
