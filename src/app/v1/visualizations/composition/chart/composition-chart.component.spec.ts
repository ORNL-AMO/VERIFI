import { TestBed } from '@angular/core/testing';
import { CompositionModule } from '../composition.module';
import { compositionFixture, equipmentCompositionEvidence } from '@domain/visualizations/testing/composition-fixtures';
import { prepareComposition } from '../composition.models';
import { CompositionChartComponent } from './composition-chart.component';

describe('composition hierarchy navigation', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps source values available to screen readers without a visible disclosure or hidden keyboard stops', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'breakdown', type: 'donut', values: 'absolute' });
    const hidden = { ...definition, series: definition.series.map(series => ({ ...series, visible: false })) };
    TestBed.configureTestingModule({ imports: [CompositionModule] });
    const fixture = TestBed.createComponent(CompositionChartComponent);
    fixture.componentRef.setInput('model', prepareComposition(hidden, [equipmentCompositionEvidence(snapshot, hidden)])); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement, data = root.querySelector('.composition-details')!;
    expect(root.querySelector('details, summary')).toBeNull(); expect(data.classList.contains('visually-hidden')).toBe(true);
    expect(data.querySelectorAll('table')).toHaveLength(2); expect(data.querySelector('a, button, [tabindex]')).toBeNull();
    expect(data.getAttribute('aria-hidden')).toBeNull();
  });
  it('preserves a branch across appearance edits and resets stale branches without changing saved hierarchy', () => {
    const { snapshot, definition } = compositionFixture(), before = structuredClone(definition);
    const model = prepareComposition(definition, [equipmentCompositionEvidence(snapshot, definition)]);
    const component = new CompositionChartComponent(); component.model = model; component.ngOnChanges();
    const root = component.children()[0]; component.drill(root.id);
    expect(component.children().map(node => node.label)).toContain('Zero');
    expect(component.children().map(node => node.label)).toContain('Unavailable');
    component.model = { ...model, title: 'Changed title' }; component.ngOnChanges(); expect(component.rootId()).toBe(root.id);
    const event = new KeyboardEvent('keydown', { key: 'Home', cancelable: true }); component.keydown(event);
    expect(event.defaultPrevented).toBe(true); expect(component.rootId()).toBe('');
    component.drill(root.id); component.model = { ...model, nodes: [] }; component.ngOnChanges(); expect(component.rootId()).toBe('');
    expect(definition).toEqual(before);
  });
  it('keeps all-zero and hidden data recoverable without inventing drawable slices', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'breakdown', type: 'donut', values: 'absolute' });
    const hidden = { ...definition, series: definition.series.map(series => ({ ...series, visible: false })) };
    const component = new CompositionChartComponent(); component.model = prepareComposition(hidden, [equipmentCompositionEvidence(snapshot, hidden)]); component.ngOnChanges();
    expect(component.hasGeometry()).toBe(false); expect(component.model.details.rows).toHaveLength(4);
    expect(component.option()).toBeUndefined();
  });
});
