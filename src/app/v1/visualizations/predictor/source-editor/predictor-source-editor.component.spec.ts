import { TestBed } from '@angular/core/testing';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { createVisualizationDefinition, type VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { visualizationSnapshot } from '../../testing/visualization-test-fixtures';
import { decisionNodeId, prepareDecisionChange } from '../../decisions/decision-tree';
import { projectPredictorItems } from '../predictor-items';
import { PredictorEditorsModule } from '../predictor-editors.module';
import { PredictorSourceEditorComponent } from './predictor-source-editor.component';

describe('predictor source decisions and editor', () => {
  it.each([
    ...[false, true].flatMap(exact => [
      { field: 'label' as const, value: 'Saved name', promoted: false, exact },
      { field: 'color' as const, value: '#123456', promoted: false, exact },
      { field: 'label' as const, value: 'Saved name', promoted: true, exact },
      { field: 'color' as const, value: '#123456', promoted: true, exact }
    ])
  ])('clears provider $field after promotion=$promoted in exact=$exact declarations', ({ field, value, promoted, exact }) => {
    const { snapshot, definition } = setup(), sourceId = 'source-1';
    const foreign = { seriesId: `${sourceId}:predictor:predictor-a`, accountGuid: 'foreign', label: 'Foreign' };
    const sibling = { resourceGuid: 'predictor-b', label: 'Dormant sibling' };
    let saved: VisualizationDefinition = { ...definition, series: [{ id: 'selected', sourceId, metric: 'value', axis: 'left', ...(exact ? { resourceGuid: 'predictor-a' } : {}), overrides: [
      { seriesId: `${sourceId}:predictor:predictor-a`, [field]: value }, foreign, sibling
    ] }] };
    if (promoted) {
      const changed = prepareDecisionChange(saved, { kind: 'item-style', sourceId, item: { resourceGuid: 'predictor-a' }, changes: { traceType: 'bar' } }, { snapshot });
      if (changed.state === 'unchanged') throw new Error('Expected resource preference');
      saved = changed.definition;
    }
    const before = structuredClone(saved);
    const result = prepareDecisionChange(saved, { kind: 'item-style', sourceId, item: { resourceGuid: 'predictor-a' }, changes: { [field]: null } }, { snapshot });
    expect(result.state).toBe('apply');
    if (result.state === 'unchanged') throw new Error('Expected reset');
    const item = projectPredictorItems(result.definition, sourceId, snapshot)[0];
    expect(item.appearance[field]).not.toBe(value);
    if (field === 'color') expect(item.customColor).toBe(false);
    expect(result.definition.series[0].overrides).toEqual(expect.arrayContaining([foreign, sibling]));
    expect(result.definition.sources).toEqual(saved.sources);
    expect(saved).toEqual(before);
  });
  it('preserves provider fallback, dormant and foreign appearances while converting exact declarations into All', () => {
    const { snapshot, definition } = setup(), sourceId = 'source-1';
    const exact: VisualizationDefinition = { ...definition, series: [{ id: 'exact', sourceId, metric: 'value', resourceGuid: 'predictor-a', label: 'My production', axis: 'right' as const, overrides: [
      { seriesId: `${sourceId}:predictor:predictor-a`, color: '#abcdef', traceType: 'bar' as const, lineStyle: 'dotted' as const },
      { resourceGuid: 'predictor-b', label: 'Dormant hours', axis: 'right' as const },
      { resourceGuid: 'predictor-b', accountGuid: 'foreign-account', label: 'Foreign dormant' }
    ] }] };
    const before = structuredClone(exact);
    const result = prepareDecisionChange(exact, { kind: 'predictor-selection', sourceId, predictorGuids: [], all: true }, { snapshot });
    if (result.state === 'unchanged') throw new Error('Expected All');
    expect(projectPredictorItems(result.definition, sourceId, snapshot).find(item => item.identity.resourceGuid === 'predictor-a')?.appearance)
      .toMatchObject({ label: 'My production', axis: 'right', color: '#abcdef', traceType: 'bar', lineStyle: 'dotted' });
    expect(projectPredictorItems(result.definition, sourceId, snapshot).find(item => item.identity.resourceGuid === 'predictor-b')?.appearance.label).toBe('Dormant hours');
    expect(result.definition.series[0].overrides).toContainEqual(exact.series[0].overrides![2]);
    expect(exact).toEqual(before);
  });
  it('turns exact presentation declarations into dormant GUID overrides when choosing All', () => {
    const { snapshot, definition } = setup();
    const exact = { ...definition, series: [{ id: 'exact', sourceId: 'source-1', metric: 'value', resourceGuid: 'predictor-a', axis: 'right' as const, label: 'Pinned name' }] };
    const result = prepareDecisionChange(exact, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [], all: true }, { snapshot });
    if (result.state === 'unchanged') throw new Error('Expected All');
    expect(result.definition.series.every(series => !series.resourceGuid)).toBe(true);
    expect(projectPredictorItems(result.definition, 'source-1', snapshot).find(item => item.identity.resourceGuid === 'predictor-a')?.appearance).toMatchObject({ label: 'Pinned name', axis: 'right' });
  });
  it('preserves sibling styles and drafts when entering All, and reviews explicit removal when returning to fixed picks', () => {
    const { snapshot, definition } = setup(), sourceId = 'source-1';
    const styled = prepareDecisionChange(definition, { kind: 'item-style', sourceId, item: { resourceGuid: 'predictor-a' }, changes: { label: 'Custom', axis: 'right' } }, { snapshot });
    if (styled.state === 'unchanged') throw new Error('Expected styling');
    const node = decisionNodeId({ kind: 'item', sourceId, itemKey: 'resource:predictor-a' });
    const all = prepareDecisionChange(styled.definition, { kind: 'predictor-selection', sourceId, predictorGuids: [], all: true }, { snapshot, invalidNodeIds: [node] });
    if (all.state === 'unchanged') throw new Error('Expected live All');
    expect(all.state).toBe('apply'); expect(all.affectedNodeIds).not.toContain(node);
    expect(projectPredictorItems(all.definition, sourceId, snapshot).find(item => item.identity.resourceGuid === 'predictor-a')?.appearance).toMatchObject({ label: 'Custom', axis: 'right' });
    const changed = { ...snapshot, predictors: [...snapshot.predictors, { ...snapshot.predictors[0], guid: 'future', name: 'Future' }] };
    expect(projectPredictorItems(all.definition, sourceId, changed).find(item => item.identity.resourceGuid === 'future')?.appearance.axis).toBe('left');
    expect(projectPredictorItems(all.definition, sourceId, { ...snapshot, predictors: [snapshot.predictors[1]] })).toHaveLength(1);
    expect(projectPredictorItems(all.definition, sourceId, snapshot).find(item => item.identity.resourceGuid === 'predictor-a')?.appearance.label).toBe('Custom');
    const fixed = prepareDecisionChange(all.definition, { kind: 'predictor-selection', sourceId, predictorGuids: ['predictor-b'] }, { snapshot, invalidNodeIds: [node] });
    expect(fixed.state).toBe('confirm');
    if (fixed.state === 'unchanged') throw new Error('Expected removal');
    expect(fixed.definition.sources[0]).toMatchObject({ selection: { kind: 'fixed', guids: ['predictor-b'] } });
  });
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
