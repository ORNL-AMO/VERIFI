import { TestBed } from '@angular/core/testing';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { visualizationSnapshot } from '../../testing/visualization-test-fixtures';
import { decisionNodeId, prepareDecisionChange } from '../../decisions/decision-tree';
import { projectPredictorItems } from '../predictor-items';
import { PredictorEditorsModule } from '../predictor-editors.module';
import { PredictorSourceEditorComponent } from './predictor-source-editor.component';

describe('predictor source decisions and editor', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const p = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-a', name: 'Production', unit: 'widgets' };
    const snapshot = { ...visualizationSnapshot(), predictors: [p, { ...p, guid: 'predictor-b', name: 'Hours' }] };
    const initial = { ...createVisualizationDefinition('History', 'account-a', { kind: 'all' }, 'predictor'),
      chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'monthly' as const, stack: 'none' as const } };
    const result = prepareDecisionChange(initial, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [p.guid] }, { snapshot });
    if (result.state === 'unchanged') throw new Error('Expected selection');
    return { snapshot, definition: result.definition };
  }
  it('adds and removes siblings without resetting existing styles, axes, or incomplete item input', () => {
    const { snapshot, definition } = setup(), sourceId = 'source-1';
    const styled = prepareDecisionChange(definition, { kind: 'item-style', sourceId, item: { resourceGuid: 'predictor-a' },
      changes: { label: 'My production', axis: 'right', color: '#123456' } }, { snapshot });
    if (styled.state === 'unchanged') throw new Error('Expected style');
    const invalidNode = decisionNodeId({ kind: 'item', sourceId, itemKey: 'resource:predictor-a' });
    const added = prepareDecisionChange(styled.definition, { kind: 'predictor-selection', sourceId, predictorGuids: ['predictor-a', 'predictor-b'] }, { snapshot, invalidNodeIds: [invalidNode] });
    expect(added.state).toBe('apply');
    if (added.state === 'unchanged') throw new Error('Expected addition');
    expect(added.affectedNodeIds).not.toContain(invalidNode);
    expect(projectPredictorItems(added.definition, sourceId, snapshot).map(item => item.appearance.axis)).toEqual(['right', 'left']);
    const removed = prepareDecisionChange(added.definition, { kind: 'predictor-selection', sourceId, predictorGuids: ['predictor-a'] }, { snapshot, invalidNodeIds: [invalidNode] });
    expect(removed.state).toBe('apply');
    if (removed.state === 'unchanged') throw new Error('Expected removal');
    expect(projectPredictorItems(removed.definition, sourceId, snapshot)[0].appearance).toMatchObject({ axis: 'right', label: 'My production', color: '#123456' });
    expect(removed.affectedNodeIds).not.toContain(invalidNode);
  });
  it('keeps stable bindings through appearance/rename and reviews replacement and affected incomplete input', () => {
    const { snapshot, definition } = setup(), sourceId = 'source-1';
    const styled = prepareDecisionChange(definition, { kind: 'item-style', sourceId, item: { resourceGuid: 'predictor-a' },
      changes: { label: 'My production', traceType: 'bar', color: '#123456', axis: 'right' } }, { snapshot });
    if (styled.state === 'unchanged') throw new Error('Expected style');
    expect(styled.definition.sources).toEqual(definition.sources);
    const renamed = { ...snapshot, predictors: snapshot.predictors.map(p => ({ ...p, name: 'Renamed' })) };
    expect(projectPredictorItems(styled.definition, sourceId, renamed)[0].appearance).toMatchObject({ label: 'My production', traceType: 'bar', color: '#123456' });
    const replaced = prepareDecisionChange(styled.definition, { kind: 'predictor-selection', sourceId, predictorGuids: ['predictor-b'] }, { snapshot,
      invalidNodeIds: [decisionNodeId({ kind: 'item', sourceId, itemKey: 'resource:predictor-a' })] });
    expect(replaced.state).toBe('confirm');
    if (replaced.state === 'unchanged') throw new Error('Expected replacement');
    expect(replaced.cleared).toContain('Incomplete input in the affected sections');
    expect(projectPredictorItems(replaced.definition, sourceId, snapshot)[0].appearance.label).toBeUndefined();
    expect(replaced.definition.period).toEqual(definition.period);
    expect(replaced.definition.sources[0].id).toBe(sourceId);
  });
  it('uses compact selection with facility-only context and routes typed changes through the owning boundary', () => {
    const { snapshot, definition } = setup(), store = new AccountWorkspaceStore(); store.publish(snapshot);
    TestBed.configureTestingModule({ imports: [PredictorEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const fixture = TestBed.createComponent(PredictorSourceEditorComponent), actions: unknown[] = [];
    fixture.componentRef.setInput('context', { definition, sourceId: 'source-1', disabled: false, changed: () => {}, request: action => actions.push(action) });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('widgets');
    expect(root.textContent).not.toContain('Standard');
    expect(root.textContent).not.toContain('Plant A');
    expect(projectPredictorItems(definition, 'source-1', snapshot)[0].unit).toBe('widgets');
    [...root.querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(button => button.textContent!.includes('Hours'))!.click();
    expect(actions).toContainEqual({ kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: ['predictor-a', 'predictor-b'] });
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b', name: 'Plant B' }] }); fixture.detectChanges();
    expect(root.textContent).toContain('Plant A');
    fixture.componentRef.setInput('context', { definition: { ...definition, facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] } }, sourceId: 'source-1', disabled: false, changed: () => {}, request: action => actions.push(action) }); fixture.detectChanges();
    expect(root.textContent).not.toContain('Plant A');
    store.publish({ ...snapshot, predictors: snapshot.predictors.map(p => ({ ...p, predictorType: 'Math' as const })) }); fixture.detectChanges();
    expect(root.textContent).toContain('Predictor type not supported');
    expect(projectPredictorItems(definition, 'source-1', store.snapshot()!)[0].label).toBe('Production');
    store.publish({ ...snapshot, predictors: [] }); fixture.detectChanges();
    expect(root.textContent).toContain('Choose a supported predictor to repair');
  });
});
