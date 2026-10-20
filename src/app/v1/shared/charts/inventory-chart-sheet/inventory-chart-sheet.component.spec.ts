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
