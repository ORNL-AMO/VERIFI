import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { buildHomeChart } from '@domain/home/home-chart-recipes';
import { analysisPickerTestProvider } from '../../testing/analysis-picker.testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnalysisPickerComponent } from '../picker/analysis-picker.component';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountAnalysisFixture, accountAnalysisDefinition, analysisFixture, analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { AnalysisEditorsModule } from '../analysis-editors.module';
import { AnalysisSourceEditorComponent } from './analysis-source-editor.component';
import { prepareDecisionChange } from '../../decisions/decision-tree';
import { projectAnalysisItems } from '../analysis-items';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';

describe('Analysis source editing', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(definition = analysisDefinition(), snapshot: AccountWorkspaceSnapshot = analysisFixture().snapshot) {
    const workspace = new AccountWorkspaceStore(); workspace.publish(snapshot);
    TestBed.configureTestingModule({ imports: [AnalysisEditorsModule], providers: [provideRouter([]), { provide: AccountWorkspaceStore, useValue: workspace }] });
    const fixture = TestBed.createComponent(AnalysisSourceEditorComponent), request = vi.fn();
    const context = { definition, sourceId: definition.sources[0].id, disabled: false, changed: vi.fn(), request };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, request, context, workspace };
  }
  it('uses one Analysis picker, multiple compatible measures and separate target scopes without nested traces', () => {
    const data = analysisFixture(), snapshot = { ...data.snapshot, facilityAnalyses: [data.analysis, { ...data.analysis, guid: 'second' }] };
    const { fixture, component, request } = setup(analysisDefinition(), snapshot);
    expect(request).not.toHaveBeenCalled();
    component.setAnalyses(['analysis-a', 'second']);
    expect(request).toHaveBeenLastCalledWith({ kind: 'analysis-targets', targets: [{ analysisGuid: 'analysis-a' }, { analysisGuid: 'second' }] });
    component.toggleMeasure('calculated');
    expect(request).toHaveBeenLastCalledWith({ kind: 'source-measures', sourceKind: 'analysis', measures: ['actual', 'calculated'] });
    component.setTargetScopes('analysis-a', ['total', 'group-a']);
    expect(request).toHaveBeenLastCalledWith({ kind: 'analysis-targets', targets: [{ analysisGuid: 'analysis-a' }, { analysisGuid: 'analysis-a', groupGuid: 'group-a' }] });
    expect(fixture.nativeElement.querySelector('app-visualization-item-settings')).toBeNull(); fixture.destroy();
  });
  it.each(['facility', 'account'] as const)('reviews replacing retained %s model intent through an explicit result selection', scope => {
    const data = scope === 'account' ? accountAnalysisFixture() : analysisFixture();
    const initial = scope === 'account' ? accountAnalysisDefinition() : analysisDefinition();
    const definition: VisualizationDefinition = { ...initial, sources: [{ id: 'source-1', kind: 'analysis', mode: 'model', analysisGuid: data.analysis.guid, modelId: 'saved-model', measure: 'modeled', aggregation: 'none' }] };
    const { fixture, component, request } = setup(definition, data.snapshot);
    component.selectAnalysis(data.analysis.guid);
    const proposal = prepareDecisionChange(definition, request.mock.lastCall![0], { snapshot: data.snapshot });
    expect(proposal.state).toBe('confirm'); if (proposal.state === 'unchanged') throw new Error('Expected reviewed replacement');
    expect(proposal.definition.sources[0]).toMatchObject({ mode: 'result', analysisGuid: data.analysis.guid, measure: 'actual' });
    expect(proposal.definition.sources[0]).not.toHaveProperty('modelId'); fixture.destroy();
  });
  it('hydrates without requests and prevents edits when disabled', () => {
    const { fixture, component, request, context } = setup();
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    component.setAnalyses([]); component.toggleMeasure('calculated'); component.setTargetScopes('analysis-a', ['group-a']); component.form.controls.interval.setValue('yearly');
    expect(request).not.toHaveBeenCalled(); expect(component.form.disabled).toBe(true); expect(component.targetScopes.disabled).toBe(true); fixture.destroy();
  });
  it('offers account totals without group or banked measure controls', () => {
    const data = accountAnalysisFixture(), { fixture, component } = setup(accountAnalysisDefinition(), data.snapshot);
    expect(component.targets()).toMatchObject([{ account: true, guid: data.analysis.guid }]);
    expect(component.measures().map(item => item.value)).toEqual(['rolling-improvement', 'actual', 'calculated', 'savings', 'losses']);
    expect(fixture.nativeElement.textContent).not.toContain('result scopes'); fixture.destroy();
  });
  it('identifies a following rule without turning the current selection into saved named intent', () => {
    const data = analysisFixture();
    const built = buildHomeChart({ kind: 'built-in', recipe: 'reporting-energy-rolling', version: 1, owner: { kind: 'facility', guid: data.facility.guid } }, data.snapshot.account.guid);
    if (built.state !== 'ready') throw new Error();
    const snapshot = { ...data.snapshot, facilities: [{ ...data.facility, selectedEnergyAnalysisId: data.analysis.guid }] };
    const { fixture, component, request } = setup(built.definition, snapshot);
    expect(fixture.nativeElement.textContent).toContain('Follow Active for reporting');
    expect(fixture.nativeElement.textContent).toContain(data.analysis.name);
    expect(component.targets()).toEqual([]); expect(request).not.toHaveBeenCalled();
    expect(component.items()[0]).toMatchObject({ identity: { resourceGuid: data.analysis.guid }, available: true });
    component.setAnalyses([data.analysis.guid]);
    const replacement = prepareDecisionChange(built.definition, request.mock.lastCall![0], { snapshot });
    expect(replacement.state).toBe('confirm');
    expect(built.definition.sources[0]).toHaveProperty('reporting');
    fixture.destroy();
  });
  it('edits wildcard Analysis presentation without activating dormant provider preferences', () => {
    const { snapshot } = analysisFixture(), initial = analysisDefinition();
    const dormant = { seriesId: 'source-1:result', label: 'Dormant label', visible: false };
    const definition = { ...initial, series: [{ id: 'wildcard', sourceId: 'source-1', metric: 'actual', axis: 'left' as const, overrides: [dormant] }] };
    const before = structuredClone(definition);
    const result = prepareDecisionChange(definition, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'analysis-a' }, changes: { color: '#123456' } }, { snapshot });
    expect(result.state).toBe('apply');
    if (result.state === 'unchanged') throw new Error('Expected color change');
    expect(projectAnalysisItems(result.definition, 'source-1', snapshot)[0].appearance).toMatchObject({ color: '#123456', visible: true });
    expect(projectAnalysisItems(result.definition, 'source-1', snapshot)[0].appearance.label).not.toBe('Dormant label');
    expect(result.definition.series[0].overrides).toContainEqual(dormant);
    expect(result.definition.sources).toEqual(definition.sources);
    expect(definition).toEqual(before);
  });
  it('reviews target/presentation loss and retains compatible appearance through measure changes', () => {
    const { snapshot } = analysisFixture();
    const definition = { ...analysisDefinition(), series: [{ ...analysisDefinition().series[0], label: 'My result', color: '#123456' }] };
    const changed = prepareDecisionChange(definition, { kind: 'analysis-measure', sourceId: 'source-1', measure: 'calculated' }, { snapshot });
    expect(changed).toMatchObject({ state: 'apply', definition: { series: [{ metric: 'calculated', label: 'My result', color: '#123456' }] } });
    const binding = prepareDecisionChange(definition, { kind: 'analysis-binding', sourceId: 'source-1', analysisGuid: 'analysis-a', groupGuid: 'group-a' }, { snapshot });
    expect(binding.state).toBe('confirm'); if (binding.state === 'unchanged') throw new Error('Expected reviewed change');
    expect(projectAnalysisItems(binding.definition, 'source-1', snapshot)[0]).toMatchObject({ identity: { resourceGuid: 'group-a' }, customized: false });
    const clear = prepareDecisionChange(definition, { kind: 'analysis-binding', sourceId: 'source-1' }, { snapshot });
    expect(clear).toMatchObject({ state: 'confirm', definition: { sources: [{ kind: 'analysis' }], series: [] } });
  });
});
