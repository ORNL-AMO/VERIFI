import { TestBed } from '@angular/core/testing';
import { MeterChartSheetComponent } from './meter-chart-sheet.component';

function setup() {
  TestBed.configureTestingModule({ imports: [MeterChartSheetComponent] });
  const fixture = TestBed.createComponent(MeterChartSheetComponent);
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
    component.toggleMeter('m0'); fixture.detectChanges();
    expect(component.visibleMetrics().map(item => item.id)).not.toContain('m0');
    expect(component.legendEntries()[0].visible).toBe(false);
    component.updateView({ legendPage: 1 }); fixture.detectChanges(); expect(component.legendEntries()).toHaveLength(2);
    component.chooseMetric('cost'); fixture.detectChanges(); expect(component.legendPage()).toBe(0);
    expect(component.visibleMetrics()).toHaveLength(9);
    for (const metric of component.visibleMetrics()) { component.toggleMeter(metric.id); fixture.detectChanges(); } fixture.detectChanges(); expect(component.visibleMetrics()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No meters selected');
    for (let i = 0; i < 10; i++) { component.toggleMeter(`m${i}`); fixture.detectChanges(); } fixture.detectChanges(); expect(component.visibleMetrics()).toHaveLength(10);
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
    expect(fixture.nativeElement.querySelector('.meter-chart-sheet--closing')).not.toBeNull();
    vi.advanceTimersByTime(360); expect(closed).toHaveBeenCalledTimes(1);
    fixture.destroy(); vi.useRealTimers(); TestBed.resetTestingModule();
    const reduced = setup(), reducedClosed = vi.fn(); reduced.componentInstance.closed.subscribe(reducedClosed);
    const original = window.matchMedia;
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    try { reduced.componentInstance.requestClose(); expect(reducedClosed).toHaveBeenCalledTimes(1); expect(reduced.componentInstance.closing()).toBe(false); }
    finally { window.matchMedia = original; reduced.destroy(); }
  });
});
