import { TestBed } from '@angular/core/testing';
import { InventoryChartTrace } from '../inventory-chart-sheet/inventory-chart-sheet.models';
import { ChartTracePanelComponent } from './chart-trace-panel.component';

const traces: InventoryChartTrace[] = [
  { id: 'a1', label: 'Alpha / Electricity', shortLabel: 'Electricity', facilityGuid: 'fa', facilityName: 'Alpha', kind: 'meter', color: 'var(--v1-chart-series-1)' },
  { id: 'a2', label: 'Alpha / Gas', shortLabel: 'Gas', facilityGuid: 'fa', facilityName: 'Alpha', kind: 'meter', color: 'var(--v1-chart-series-2)' },
  { id: 'b1', label: 'Beta / Electricity', shortLabel: 'Electricity', facilityGuid: 'fb', facilityName: 'Beta', kind: 'meter', color: 'var(--v1-chart-series-3)' }
];
function setup(items = traces, hidden: readonly string[] = []) {
  const fixture = TestBed.configureTestingModule({ imports: [ChartTracePanelComponent] }).createComponent(ChartTracePanelComponent);
  fixture.componentRef.setInput('traces', items); fixture.componentRef.setInput('hiddenGuids', hidden);
  fixture.componentInstance.visibilityChanged.subscribe(value => fixture.componentRef.setInput('hiddenGuids', value));
  fixture.componentInstance.collapsedChanged.subscribe(value => fixture.componentRef.setInput('collapsedFacilities', value));
  fixture.detectChanges(); return fixture;
}
describe('facility-grouped chart traces', () => {
  it('uses radio selection in single-predictor mode and never restores multiple traces on repeated activation', () => {
    const fixture = setup(traces, ['a2', 'b1']), selected = vi.fn();
    fixture.componentRef.setInput('singleSelection', true); fixture.componentRef.setInput('selectedGuid', 'a1');
    fixture.componentInstance.selected.subscribe(guid => { selected(guid); fixture.componentRef.setInput('selectedGuid', guid); });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    const radio = fixture.nativeElement.querySelector('[aria-label="Show Beta / Electricity"]') as HTMLInputElement;
    radio.click(); fixture.detectChanges(); expect(selected).toHaveBeenLastCalledWith('b1'); expect(radio.checked).toBe(true);
    const name = fixture.nativeElement.querySelector('[aria-label="Alpha / Gas"]') as HTMLButtonElement;
    name.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true })); fixture.detectChanges();
    expect(selected).toHaveBeenLastCalledWith('a2');
    name.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true })); fixture.detectChanges();
    expect(selected).toHaveBeenLastCalledWith('a2');
    fixture.componentRef.setInput('singleSelection', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.chart-traces__all input')).not.toBeNull();
    fixture.destroy();
  });
  it('uses short labels under separate facility headings and renders every trace without pagination', () => {
    const fixture = setup();
    expect([...fixture.nativeElement.querySelectorAll('.chart-traces__group-name')].map((node: HTMLElement) => node.textContent.trim())).toEqual(['Alpha', 'Beta']);
    expect([...fixture.nativeElement.querySelectorAll('.chart-traces__row .chart-traces__name')].map((node: HTMLElement) => node.textContent.trim())).toEqual(['Electricity', 'Gas', 'Electricity']);
    expect(fixture.nativeElement.querySelectorAll('.chart-traces__row')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[aria-label="Alpha / Electricity"]').title).toContain('Double-click');
    expect(fixture.nativeElement.textContent).not.toContain('Only'); fixture.destroy();
  });
  it('maintains aggregate checkbox state and restores all traces after hiding them', () => {
    const fixture = setup(traces, ['a2', 'other-metric']);
    const facility = fixture.nativeElement.querySelector('[aria-label="Show traces for Alpha"]') as HTMLInputElement;
    expect(facility.indeterminate).toBe(true);
    facility.click(); fixture.detectChanges();
    expect(fixture.componentInstance.visibleCount()).toBe(3); expect(facility.indeterminate).toBe(false);
    const all = fixture.nativeElement.querySelector('.chart-traces__all input') as HTMLInputElement;
    all.click(); fixture.detectChanges(); expect(fixture.componentInstance.visibleCount()).toBe(0);
    all.click(); fixture.detectChanges(); expect(fixture.componentInstance.visibleCount()).toBe(3);
    expect(fixture.componentInstance.hiddenGuids()).toEqual(['other-metric']); fixture.destroy();
  });
  it('isolates by double-click or keyboard activation, with a second activation restoring all', () => {
    const fixture = setup();
    const name = fixture.nativeElement.querySelector('[aria-label="Alpha / Electricity"]') as HTMLButtonElement;
    name.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true })); fixture.detectChanges();
    expect(fixture.componentInstance.visibleCount()).toBe(3);
    name.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true })); fixture.detectChanges();
    expect(fixture.componentInstance.hiddenGuids()).toEqual(['a2', 'b1']);
    name.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true })); fixture.detectChanges(); expect(fixture.componentInstance.visibleCount()).toBe(3);
    name.click(); fixture.detectChanges(); expect(fixture.componentInstance.visibleCount()).toBe(1);
    const facility = fixture.nativeElement.querySelector('.chart-traces__group-name') as HTMLButtonElement;
    facility.click(); fixture.detectChanges(); expect(fixture.componentInstance.hiddenGuids()).toEqual(['b1']);
    fixture.destroy();
  });
  it('collapses facilities without altering visibility and keeps the chosen checkbox values', () => {
    const fixture = setup(traces, ['a2']); const changed = vi.fn(); fixture.componentInstance.visibilityChanged.subscribe(changed);
    fixture.nativeElement.querySelector('[aria-label="Collapse Alpha"]').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#trace-facility-fa').hidden).toBe(true);
    expect(fixture.componentInstance.visibleCount()).toBe(2); expect(changed).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="Expand Alpha"]').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Show Alpha / Gas"]').checked).toBe(false); fixture.destroy();
  });
  it('uses a flat list with one facility or facility totals while keeping identities unique', () => {
    const fixture = setup(traces.slice(0, 2));
    expect(fixture.nativeElement.querySelectorAll('.chart-traces__group-name')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.chart-traces__facility').textContent.trim()).toBe('Alpha');
    fixture.componentRef.setInput('traces', traces.filter(trace => trace.id !== 'a2').map(trace => ({ ...trace, kind: 'facility', shortLabel: trace.facilityName }))); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.chart-traces__group-name')).toHaveLength(0);
    expect([...fixture.nativeElement.querySelectorAll('.chart-traces__row .chart-traces__name')].map((node: HTMLElement) => node.textContent.trim())).toEqual(['Alpha', 'Beta']); fixture.destroy();
  });
  it('distinguishes duplicate facility and meter names and prunes deleted controls', () => {
    const fixture = setup(traces.map(trace => ({ ...trace, facilityName: 'Plant', shortLabel: 'Electricity' })));
    expect([...fixture.nativeElement.querySelectorAll('.chart-traces__group-name')].map((node: HTMLElement) => node.textContent.trim())).toEqual(['Plant (fa)', 'Plant (fb)']);
    expect([...fixture.nativeElement.querySelectorAll('.chart-traces__row .chart-traces__name')].map((node: HTMLElement) => node.textContent.trim())).toEqual(['Electricity (a1)', 'Electricity (a2)', 'Electricity']);
    fixture.componentRef.setInput('traces', [traces[2]]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.chart-traces__row')).toHaveLength(1); fixture.destroy();
  });
  it('qualifies duplicate facility names in the flat facility-totals list', () => {
    const fixture = setup([traces[0], traces[2]].map(trace => ({ ...trace, facilityName: 'Plant', shortLabel: 'Plant', kind: 'facility' })));
    expect([...fixture.nativeElement.querySelectorAll('.chart-traces__row .chart-traces__name')].map((node: HTMLElement) => node.textContent.trim())).toEqual(['Plant (fa)', 'Plant (fb)']);
    fixture.destroy();
  });
  it('makes loading, errors and empty metrics explicit', () => {
    const fixture = setup([]);
    fixture.componentRef.setInput('state', 'loading'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Preparing traces');
    fixture.componentRef.setInput('state', 'error'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Traces are unavailable');
    fixture.componentRef.setInput('state', 'ready'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No traces for this chart'); fixture.destroy();
  });
});
