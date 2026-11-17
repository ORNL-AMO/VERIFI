import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { VisualizationDecisionItem } from '../../../decisions/decision-types';
import { ItemSettingsComponent } from './item-settings.component';
import { ItemSettingsModule } from './item-settings.module';

const item: VisualizationDecisionItem = { key: 'resource:meter-a', sourceId: 'utility', selectedId: 'energy', identity: { resourceGuid: 'meter-a' },
  label: 'Main meter', detail: '', unit: 'kWh', available: true, missing: false, customized: false, customColor: false,
  appearance: { traceType: 'line', axis: 'left', visible: true, color: 'var(--v1-chart-series-1)', lineStyle: 'solid' } };

describe('combined item settings', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    TestBed.configureTestingModule({ imports: [ItemSettingsModule] });
    const fixture = TestBed.createComponent(ItemSettingsComponent);
    fixture.componentRef.setInput('item', item); fixture.componentRef.setInput('editorKey', 'saved-a');
    fixture.componentRef.setInput('expandedNodes', new Set(['item:utility:resource%3Ameter-a']));
    const requested = vi.fn(); fixture.componentInstance.requested.subscribe(requested); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, requested };
  }
  it('requests typed item-only styling and emits nothing on initial hydration', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    expect(state.requested).not.toHaveBeenCalled();
    expect(state.component.form.controls.customColor.value).toBe(false);
    root.querySelector<HTMLButtonElement>('button[aria-label="Bar"]')!.click(); state.fixture.detectChanges();
    expect(state.requested).toHaveBeenCalledWith({ kind: 'item-style', sourceId: 'utility', item: { resourceGuid: 'meter-a' }, changes: { traceType: 'bar' } });
    state.component.form.controls.axis.setValue('right');
    expect(state.requested).toHaveBeenLastCalledWith(expect.objectContaining({ changes: { axis: 'right' } }));
  });
  it('offers area and keyboard-compatible order actions without rewriting appearance', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    state.fixture.componentRef.setInput('position', 1); state.fixture.componentRef.setInput('itemCount', 3); state.fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button[aria-label="Area"]')!.click();
    expect(state.requested).toHaveBeenLastCalledWith(expect.objectContaining({ changes: { traceType: 'area' } }));
    root.querySelector<HTMLButtonElement>('button[aria-label="Move Main meter up"]')!.click();
    expect(state.requested).toHaveBeenLastCalledWith({ kind: 'item-order', sourceId: 'utility', item: { resourceGuid: 'meter-a' }, direction: 'up' });
    state.fixture.componentRef.setInput('position', 0); state.fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('button[aria-label="Move Main meter up"]')!.disabled).toBe(true);
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Reset order')!.click();
    expect(state.requested).toHaveBeenLastCalledWith({ kind: 'reset-order', sourceId: 'utility' });
  });
  it('shows all item controls together under one named accordion', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-visualization-decision-section')).toHaveLength(1);
    expect(root.querySelector('.decision-section__toggle strong')?.textContent).toBe('Main meter');
    const body = root.querySelector<HTMLElement>('.decision-section__body')!;
    expect(body.hidden).toBe(false);
    expect(body.querySelector('[aria-label="Main meter trace type"]')).not.toBeNull();
    expect(body.querySelector('[aria-label="Main meter axis"]')).not.toBeNull();
    expect(body.querySelector('input[formcontrolname="visible"]')).not.toBeNull();
    expect(body.querySelector('input[formcontrolname="label"]')).not.toBeNull();
    expect(body.querySelector('input[formcontrolname="customColor"]')).not.toBeNull();
    expect(body.querySelector('[aria-label="Main meter line pattern"]')).not.toBeNull();
    state.component.form.controls.customColor.setValue(true); state.fixture.detectChanges();
    expect(body.querySelector('input[formcontrolname="color"]')).not.toBeNull();
  });
  it('retains equivalent raw label text across acknowledgement and collapse', () => {
    const state = setup();
    state.component.form.controls.label.setValue('  Purchased electricity  '); state.fixture.detectChanges();
    state.fixture.componentRef.setInput('item', { ...item, appearance: { ...item.appearance, label: 'Purchased electricity' } });
    state.fixture.detectChanges();
    expect(state.component.form.controls.label.value).toBe('  Purchased electricity  ');
    state.fixture.componentRef.setInput('expandedNodes', new Set()); state.fixture.detectChanges();
    expect(state.component.form.controls.label.value).toBe('  Purchased electricity  ');
    expect(state.fixture.nativeElement.querySelector('input[formcontrolname="label"]')).not.toBeNull();
  });
  it('clears only the color override when following the palette again', () => {
    const state = setup();
    state.component.form.controls.customColor.setValue(true);
    state.component.form.controls.color.setValue('#123456');
    state.component.form.controls.customColor.setValue(false);
    expect(state.requested).toHaveBeenLastCalledWith(expect.objectContaining({ changes: { color: null } }));
  });
  it('keeps disabled controls from emitting edits', () => {
    const state = setup(); state.fixture.componentRef.setInput('disabled', true); state.fixture.detectChanges();
    (state.fixture.nativeElement.querySelector('button[aria-label="Bar"]') as HTMLButtonElement).click();
    expect(state.requested).not.toHaveBeenCalled();
    expect(state.fixture.nativeElement.querySelector('input[formcontrolname="visible"]').matches(':disabled')).toBe(true);
  });
});
