import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { visualizationSnapshot } from '../../../testing/visualization-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { UtilityEditorsModule } from '../utility-editors.module';
import { UtilitySourceEditorComponent } from './utility-source-editor.component';
import { prepareDecisionChange } from '../../../decisions/decision-tree';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';

describe('shared meter selection and measures', () => {
  function setup() {
    const store = new AccountWorkspaceStore();
    store.publish({ ...visualizationSnapshot(), meters: [meter({}), meter({ guid: 'meter-b' })] });
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const fixture = TestBed.createComponent(UtilitySourceEditorComponent), requested = vi.fn();
    let definition = utilityVisualizationFixture();
    const hydrate = () => { fixture.componentRef.setInput('context', { definition, sourceId: definition.sources[0].id, editorKey: 'test', disabled: false,
      expandedNodes: new Set(['measure:utility', 'resources:utility', 'selection-mode:utility', 'data-settings:utility']),
      request: action => { requested(action); const result = prepareDecisionChange(definition, action, { snapshot: store.snapshot()! }); if (result.state !== 'unchanged') definition = result.definition; } }); fixture.detectChanges(); };
    hydrate();
    return { fixture, component: fixture.componentInstance, requested, hydrate, definition: () => definition, store };
  }
  it('selects Energy and Cost together without duplicating resource controls or exposing units', () => {
    const state = setup(); state.component.selectMeasure('cost'); state.hydrate();
    expect(state.component.selectedMeasures()).toEqual(['energy', 'cost']);
    expect(state.definition().sources).toHaveLength(2);
    state.component.toggleResource({ guid: 'meter-b', selected: true }); state.hydrate();
    expect(state.definition().sources.every(source => 'selection' in source && source.selection?.kind === 'fixed' && source.selection.guids.includes('meter-b'))).toBe(true);
    const root = state.fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-visualization-resource-picker')).toHaveLength(1);
    expect(root.querySelector('input[formcontrolname="unit"]')).toBeNull();
    expect(root.querySelector('app-visualization-item-settings')).toBeNull();
  });
  it('retains the other measure and requests reviewed removal of customized traces', () => {
    const state = setup(); state.component.selectMeasure('cost'); state.hydrate();
    state.component.selectMeasure('energy'); state.hydrate();
    expect(state.definition().sources.map(source => source.measure)).toEqual(['cost']);
    expect(state.requested).toHaveBeenLastCalledWith({ kind: 'source-measures', sourceKind: 'utility', measures: ['cost'] });
  });
  it('uses bill dates automatically for charges and calendarized data for regular measures', () => {
    const state = setup();
    expect(state.component.visibleMeasures().find(measure => measure.value === 'charge')?.disabled).toBe(false);
    expect(state.fixture.nativeElement.textContent).not.toContain('Use Calendarized Data');
    state.component.selectMeasure('charge'); state.hydrate();
    expect(state.fixture.nativeElement.querySelector('.resource-picker__all')).toBeNull();
    const meters = state.fixture.nativeElement.querySelectorAll('.resource-picker__option') as NodeListOf<HTMLButtonElement>;
    meters[1].click(); state.hydrate();
    expect(state.component.selected.value).toEqual(['meter-b']);
    expect(state.component.chargeMeter()?.guid).toBe('meter-b');
    expect(state.requested).toHaveBeenLastCalledWith({ kind: 'set-resources', sourceId: 'utility-charge', resourceIds: ['meter-b'] });
    expect(state.definition().sources).toMatchObject([{ measure: 'charge', dataMode: 'billing-period', aggregation: 'none' }]);
    expect(state.definition().chart).toMatchObject({ interval: 'native' });
    state.component.selectMeasure('energy'); state.hydrate();
    expect(state.fixture.nativeElement.querySelector('.resource-picker__all')).not.toBeNull();
    expect(state.definition().sources).toMatchObject([{ measure: 'energy', dataMode: 'calendarized' }]);
    expect(state.definition().chart).toMatchObject({ interval: 'monthly' });
    state.component.toggleResource({ guid: 'meter-a', selected: true }); state.hydrate();
    expect(state.component.visibleMeasures().find(measure => measure.value === 'charge')?.disabled).toBe(true);
  });
});
