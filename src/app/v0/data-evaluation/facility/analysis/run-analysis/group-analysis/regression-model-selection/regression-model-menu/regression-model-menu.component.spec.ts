import { computed, CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { RegressionModelMenuComponent } from './regression-model-menu.component';

@NgModule({ declarations: [RegressionModelMenuComponent], imports: [CommonModule, ReactiveFormsModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class RegressionMenuTestModule { }

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>(finish => { resolve = finish; });
  return { promise, resolve: (value: T) => resolve(value) };
}

function makeGroup(idbGroupId: string): AnalysisGroup {
  return {
    idbGroupId, analysisType: 'regression', isGeneratedModel: false, maxModelVariables: 1,
    regressionConstant: 10, regressionModelNotes: 'original',
    predictorVariables: [{ id: 'predictor-a', name: 'Production', productionInAnalysis: true, regressionCoefficient: 2 }]
  } as AnalysisGroup;
}

describe('RegressionModelMenuComponent save ownership', () => {
  let component: RegressionModelMenuComponent;
  let group: AnalysisGroup;
  let analysis: IdbAnalysisItem;
  let selectedGroup: BehaviorSubject<AnalysisGroup>;
  let selectedAnalysis: ReturnType<typeof signal<IdbAnalysisItem>>;
  let execute: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let generate: ReturnType<typeof vi.fn>;
  let applyGenerated: ReturnType<typeof vi.fn>;
  let setForGroup: ReturnType<typeof vi.fn>;
  let pending: ReturnType<typeof deferred<any>>;

  beforeEach(() => {
    group = makeGroup('group-a');
    analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', baselineYear: 2023, groups: [group] } as IdbAnalysisItem;
    selectedGroup = new BehaviorSubject(group);
    selectedAnalysis = signal(analysis);
    pending = deferred<any>();
    execute = vi.fn(() => pending.promise);
    update = vi.fn(async () => analysis);
    generate = vi.fn();
    applyGenerated = vi.fn();
    setForGroup = vi.fn();
    TestBed.configureTestingModule({ imports: [RegressionMenuTestModule], providers: [
      RegressionModelMenuComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a', assessmentReportVersion: 'AR6' }),
        selectedFacility: signal({ guid: 'facility-a' }), selectedFacilityAnalysis: selectedAnalysis,
        facilityAnalyses: computed(() => [selectedAnalysis()]),
        facilityPredictorData: signal([]), facilityMeterData: signal([]), facilityMeters: signal([])
      } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisGroup: update } },
      { provide: AnalysisService, useValue: { selectedGroup } },
      { provide: RegressionModelStateService, useValue: { modelsByGroup: signal({}), setForGroup } },
      { provide: SharedDataService, useValue: {} },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: new BehaviorSubject(undefined) } },
      { provide: RegressionModelsService, useValue: { generateModels: generate, applyGeneratedModelsToGroup: applyGenerated, terminateCurrentWorker: vi.fn() } }
    ] });
    component = TestBed.inject(RegressionModelMenuComponent);
    TestBed.flushEffects();
    execute.mockClear();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('queues only changed fields for the intended analysis and never reselects a departed group', async () => {
    const saving = component.saveItem({ ...group, regressionModelNotes: 'edited' });
    const [, persist] = execute.mock.calls[0];
    const nextGroup = makeGroup('group-b');
    selectedGroup.next(nextGroup);
    selectedAnalysis.set({ ...analysis, guid: 'analysis-b', groups: [nextGroup] });

    await persist();
    expect(update).toHaveBeenCalledWith('analysis-a', 'group-a', { regressionModelNotes: 'edited' }, 'account-a');
    pending.resolve({ value: analysis });
    await saving;
    expect(selectedGroup.value).toBe(nextGroup);
    expect(selectedAnalysis().guid).toBe('analysis-b');
  });

  it('does not apply a generated model after switching analyses', async () => {
    const generation = deferred<any>();
    generate.mockReturnValue(generation.promise);
    const generating = component.generateModels();
    selectedAnalysis.set({ ...analysis, guid: 'analysis-b' });
    generation.resolve([]);
    await generating;
    expect(applyGenerated).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(setForGroup).not.toHaveBeenCalled();
  });

  it('does not apply a generated model after the editor is destroyed', async () => {
    const generation = deferred<any>();
    generate.mockReturnValue(generation.promise);
    const generating = component.generateModels();
    TestBed.resetTestingModule();
    generation.resolve([]);
    await generating;
    expect(applyGenerated).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
  it('keeps an explicit reversion while the previous input save is still pending', async () => {
    const first = component.saveFormValue({ regressionConstant: 11 });
    const reverted = component.saveFormValue({ regressionConstant: 10 });
    expect(execute).toHaveBeenCalledTimes(2);
    const firstPersist = execute.mock.calls[0][1];
    const revertedPersist = execute.mock.calls[1][1];
    await firstPersist();
    await revertedPersist();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', 'group-a', { regressionConstant: 11 }, 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', 'group-a', { regressionConstant: 10 }, 'account-a');
    pending.resolve({ value: analysis });
    await Promise.all([first, reverted]);
  });

  it('submits a model-type reversion even while the previous type change is pending', async () => {
    component.form.controls.isGeneratedModel.setValue(true);
    const first = component.changeModelType();
    component.form.controls.isGeneratedModel.setValue(false);
    const reverted = component.changeModelType();
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[0][1]();
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', 'group-a', expect.objectContaining({ isGeneratedModel: true }), 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', 'group-a', expect.objectContaining({ isGeneratedModel: false, regressionConstant: 10 }), 'account-a');
    pending.resolve({ value: analysis });
    await Promise.all([first, reverted]);
  });

  function selectGroup(next: AnalysisGroup): void {
    group = next;
    analysis = { ...analysis, groups: [next] };
    selectedAnalysis.set(analysis);
    selectedGroup.next(next);
  }

  function selectedModel(modelId = 'model-a'): JStatRegressionModel {
    return { modelId, modelYear: 2023, coef: [10, 2], predictorVariables: group.predictorVariables } as JStatRegressionModel;
  }

  it('rejects regeneration when a newer model selection commits before its queued save', async () => {
    const modelA = selectedModel();
    selectGroup({ ...group, isGeneratedModel: true, selectedModelId: modelA.modelId, models: [modelA], regressionModelYear: 2023 });
    TestBed.flushEffects();
    const gate = deferred<void>();
    execute.mockImplementation((_, persist) => gate.promise.then(persist).then(value => ({ value })));
    generate.mockResolvedValue([{ ...modelA, coef: [30, 4] }]);
    const generating = component.generateModels();
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(1);
    const modelB = { ...modelA, modelId: 'model-b', coef: [20, 3] };
    selectGroup({ ...group, selectedModelId: modelB.modelId, models: [modelB], regressionConstant: 20,
      predictorVariables: group.predictorVariables.map(variable => ({ ...variable, regressionCoefficient: 3 })) });
    gate.resolve();
    await generating;
    expect(update).not.toHaveBeenCalled();
    expect(applyGenerated).not.toHaveBeenCalled();
    expect(setForGroup).not.toHaveBeenCalled();
    expect(component.modelingError()).toBe(false);
    expect(selectedAnalysis().groups[0].selectedModelId).toBe('model-b');
    expect(selectedAnalysis().groups[0].models[0].coef).toEqual([20, 3]);
  });

  it('ignores regeneration already superseded by a selection before the Worker completes', async () => {
    const model = selectedModel();
    selectGroup({ ...group, isGeneratedModel: true, selectedModelId: model.modelId, models: [model] });
    TestBed.flushEffects();
    const generation = deferred<JStatRegressionModel[]>();
    generate.mockReturnValue(generation.promise);
    const generating = component.generateModels();
    selectGroup({ ...group, selectedModelId: 'model-b' });
    generation.resolve([model]);
    await generating;
    expect(execute).not.toHaveBeenCalled();
    expect(applyGenerated).not.toHaveBeenCalled();
    expect(setForGroup).not.toHaveBeenCalled();
    expect(component.generatingModels()).toBe(false);
  });

  it('persists the complete regenerated selection while retaining newer notes', async () => {
    const model = selectedModel();
    selectGroup({ ...group, isGeneratedModel: true, selectedModelId: model.modelId, models: [model], regressionModelYear: 2023 });
    TestBed.flushEffects();
    const generation = deferred<JStatRegressionModel[]>();
    generate.mockReturnValue(generation.promise);
    const regenerated = { ...model, coef: [30, 4] };
    applyGenerated.mockImplementation(current => ({
      updatedGroup: { ...current, models: [regenerated], regressionConstant: 30,
        predictorVariables: current.predictorVariables.map(variable => ({ ...variable, regressionCoefficient: 4 })) },
      newSelectedModel: regenerated
    }));
    update.mockImplementation(async (_, __, changes) => ({ ...analysis, groups: [{ ...group, ...changes }] }));
    execute.mockImplementation(async (_, persist) => ({ value: await persist() }));
    const generating = component.generateModels();
    selectGroup({ ...group, regressionModelNotes: 'newer notes' });
    generation.resolve([regenerated]);
    await generating;
    expect(applyGenerated.mock.calls[0][0].regressionModelNotes).toBe('newer notes');
    expect(update).toHaveBeenCalledWith('analysis-a', 'group-a', expect.objectContaining({
      selectedModelId: 'model-a', models: [regenerated], regressionModelYear: 2023,
      regressionConstant: 30, predictorVariables: [{ id: 'predictor-a', regressionCoefficient: 4 }]
    }), 'account-a');
    expect(update.mock.calls[0][2]).not.toHaveProperty('regressionModelNotes');
    expect(setForGroup).toHaveBeenCalledWith('group-a', [regenerated]);
    expect(component.generatingModels()).toBe(false);
  });

  it('resets generation on an owner switch without letting an old completion stop a newer request', async () => {
    const first = deferred<JStatRegressionModel[]>();
    const second = deferred<JStatRegressionModel[]>();
    generate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const oldGeneration = component.generateModels();
    expect(component.generatingModels()).toBe(true);
    selectGroup(makeGroup('group-b'));
    TestBed.flushEffects();
    expect(component.generatingModels()).toBe(false);
    const newGeneration = component.generateModels();
    expect(component.generatingModels()).toBe(true);
    first.resolve([]);
    await oldGeneration;
    expect(component.generatingModels()).toBe(true);
    expect(applyGenerated).not.toHaveBeenCalled();
    selectGroup(makeGroup('group-c'));
    TestBed.flushEffects();
    second.resolve([]);
    await newGeneration;
    expect(component.generatingModels()).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

});
