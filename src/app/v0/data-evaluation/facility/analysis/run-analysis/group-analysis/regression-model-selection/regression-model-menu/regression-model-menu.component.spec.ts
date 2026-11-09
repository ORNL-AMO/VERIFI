import { CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { RegressionModelSelectionComponent } from '../regression-model-selection.component';
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
    regressionModelStartMonth: 0, regressionStartYear: 2023, regressionModelEndMonth: 11, regressionEndYear: 2023,
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
  let modelsByGroup: ReturnType<typeof signal<Record<string, JStatRegressionModel[]>>>;
  let pending: ReturnType<typeof deferred<any>>;

  beforeEach(() => {
    group = makeGroup('group-a');
    analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', baselineYear: 2023, groups: [group] } as IdbAnalysisItem;
    selectedGroup = new BehaviorSubject(group);
    selectedAnalysis = signal(analysis);
    pending = deferred<any>();
    execute = vi.fn((_options: unknown, _persist: () => Promise<unknown>) => pending.promise);
    update = vi.fn(async () => analysis);
    generate = vi.fn();
    applyGenerated = vi.fn();
    setForGroup = vi.fn();
    modelsByGroup = signal<Record<string, JStatRegressionModel[]>>({});
    TestBed.configureTestingModule({ imports: [RegressionMenuTestModule], providers: [
      RegressionModelMenuComponent, RegressionModelSelectionComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a', assessmentReportVersion: 'AR6' }),
        selectedFacility: signal({ guid: 'facility-a' }), selectedFacilityAnalysis: selectedAnalysis,
        facilityPredictorData: signal([]), facilityMeterData: signal([]), facilityMeters: signal([])
      } },
      { provide: AccountWorkspaceQueryService, useValue: { getAccountAnalysesForFacilityAnalysis: () => [] } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisGroup: update } },
      { provide: AnalysisService, useValue: { selectedGroup, hideInUseMessage: new BehaviorSubject(false) } },
      { provide: RegressionModelStateService, useValue: { modelsByGroup, setForGroup } },
      { provide: SharedDataService, useValue: {} },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: new BehaviorSubject(undefined) } },
      { provide: RegressionModelsService, useValue: { generateModels: generate, applyGeneratedModelsToGroup: applyGenerated, terminateCurrentWorker: vi.fn() } }
    ] });
    component = TestBed.inject(RegressionModelMenuComponent);
    TestBed.flushEffects();
    execute.mockClear();
  });

  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

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
  it('debounces typing, skips unchanged notes, and never writes during hydration', async () => {
    vi.useFakeTimers();
    expect(execute).not.toHaveBeenCalled();
    await component.saveFormValue();
    await vi.advanceTimersByTimeAsync(300);
    expect(execute).not.toHaveBeenCalled();
    component.form.controls.regressionModelNotes.setValue('a');
    await component.saveFormValue();
    await vi.advanceTimersByTimeAsync(200);
    component.form.controls.regressionModelNotes.setValue('ab');
    await component.saveFormValue();
    await vi.advanceTimersByTimeAsync(299);
    expect(execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledTimes(1);
    const [, persist] = execute.mock.calls[0];
    await persist();
    expect(update).toHaveBeenCalledWith('analysis-a', 'group-a', { regressionModelNotes: 'ab' }, 'account-a');
    pending.resolve({ value: analysis });
    await component.flushChanges();
  });

  it('keeps a newer invalid number when an older save publishes', async () => {
    component.form.controls.regressionModelNotes.setValue('first');
    const saving = component.saveFormValue(true);
    component.form.controls.regressionConstant.setValue(null);
    await component.saveFormValue();
    const published = { ...group, regressionModelNotes: 'first' };
    selectedAnalysis.set({ ...analysis, groups: [published] });
    selectedGroup.next(published);
    TestBed.flushEffects();
    pending.resolve({ value: selectedAnalysis() });
    await saving;
    expect(component.form.controls.regressionConstant.value).toBeNull();
    expect(component.autosave.dirty()).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    const preventDefault = vi.fn();
    component.beforeUnload({ preventDefault, returnValue: undefined } as unknown as BeforeUnloadEvent);
    expect(preventDefault).toHaveBeenCalledOnce();
    const guard = TestBed.inject(RouterGuardService);
    const leaving = component.canDeactivate();
    await Promise.resolve();
    expect(guard.showSave.value).toBe(false);
    guard.setModalAction('cancel');
    expect(await leaving).toBe(false);
    expect(component.form.controls.regressionConstant.value).toBeNull();
  });

  it('retains a failed draft and retries it without reverting newer local text', async () => {
    execute.mockRejectedValueOnce(new Error('disk unavailable'));
    component.form.controls.regressionModelNotes.setValue('edited');
    expect(await component.saveFormValue(true)).toBe(false);
    expect(component.autosave.error()).toContain('could not be saved');
    expect(component.form.controls.regressionModelNotes.value).toBe('edited');
    execute.mockResolvedValue({ value: analysis });
    expect(await component.flushChanges()).toBe(true);
    expect(component.autosave.error()).toBeUndefined();
    expect(component.autosave.dirty()).toBe(false);
  });

  it('saves a reversion after the older model input write completes', async () => {
    component.form.controls.regressionConstant.setValue(11);
    const first = component.saveFormValue(true);
    component.form.controls.regressionConstant.setValue(10);
    const reverted = component.saveFormValue(true);
    expect(execute).toHaveBeenCalledTimes(1);
    await execute.mock.calls[0][1]();
    pending.resolve({ value: analysis });
    await Promise.all([first, reverted]);
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', 'group-a', { regressionConstant: 11 }, 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', 'group-a', { regressionConstant: 10 }, 'account-a');
  });

  it('keeps the latest model type while an earlier type save is pending', async () => {
    component.form.controls.isGeneratedModel.setValue(true);
    const first = component.changeModelType();
    component.form.controls.isGeneratedModel.setValue(false);
    const reverted = component.changeModelType();
    expect(execute).toHaveBeenCalledTimes(1);
    await execute.mock.calls[0][1]();
    pending.resolve({ value: analysis });
    await Promise.all([first, reverted]);
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', 'group-a', expect.objectContaining({ isGeneratedModel: true }), 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', 'group-a', expect.objectContaining({ isGeneratedModel: false }), 'account-a');
  });

  function attachRealMenuToSelection() {
    const variable = group.predictorVariables[0];
    const firstModel = { modelId: 'model-a', coef: [10, 2], modelYear: 2023, predictorVariables: [variable], isValid: true } as JStatRegressionModel;
    const secondModel = { ...firstModel, modelId: 'model-b', coef: [20, 3] };
    group = { ...group, isGeneratedModel: true, selectedModelId: firstModel.modelId, regressionModelYear: 2023, models: [firstModel] };
    selectedGroup.next(group);
    selectedAnalysis.set({ ...analysis, groups: [group] });
    modelsByGroup.set({ 'group-a': [firstModel, secondModel] });
    const selection = TestBed.inject(RegressionModelSelectionComponent);
    // Supply its view query with the real injected child rather than mocking the save delegate.
    Object.assign(selection, { modelMenu: component });
    TestBed.flushEffects();
    return selection;
  }

  it('preserves A to B pending to A through the real selection-to-menu delegate', async () => {
    const selection = attachRealMenuToSelection();
    const choosing = selection.selectModel('model-b');
    const reverting = selection.selectModel('model-a');
    expect(component.form.controls.regressionConstant.value).toBe(10);
    expect(execute).toHaveBeenCalledTimes(1);
    await execute.mock.calls[0][1]();
    pending.resolve({ value: analysis });
    await Promise.all([choosing, reverting]);
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', 'group-a', expect.objectContaining({ selectedModelId: 'model-b', regressionConstant: 20 }), 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', 'group-a', expect.objectContaining({ selectedModelId: 'model-a', regressionConstant: 10 }), 'account-a');
  });

  it('preserves pending notes and newer typing while the real menu selects a model', async () => {
    const selection = attachRealMenuToSelection();
    component.form.controls.regressionModelNotes.setValue('first notes');
    const saving = component.saveFormValue(true);
    const choosing = selection.selectModel('model-b');
    component.form.controls.regressionModelNotes.setValue('latest notes');
    await component.saveFormValue();
    const leaving = component.flushChanges();
    pending.resolve({ value: analysis });
    await Promise.all([saving, choosing, leaving]);
    expect(component.form.controls.regressionModelNotes.value).toBe('latest notes');
    expect(component.form.controls.regressionConstant.value).toBe(20);
    const lastPersist = execute.mock.calls[execute.mock.calls.length - 1][1];
    await lastPersist();
    expect(update).toHaveBeenLastCalledWith('analysis-a', 'group-a', expect.objectContaining({
      selectedModelId: 'model-b', regressionConstant: 20, regressionModelNotes: 'latest notes'
    }), 'account-a');
  });

  it('keeps newer notes while a modeling-method change is queued behind an older autosave', async () => {
    component.form.controls.regressionModelNotes.setValue('first notes');
    const first = component.saveFormValue(true);
    component.form.controls.isGeneratedModel.setValue(true);
    const changing = component.changeModelType();
    component.form.controls.regressionModelNotes.setValue('latest notes');
    await component.saveFormValue();
    const flushing = component.flushChanges();
    pending.resolve({ value: analysis });
    await Promise.all([first, changing, flushing]);
    expect(component.form.controls.regressionModelNotes.value).toBe('latest notes');
    expect(component.autosave.value.values.regressionModelNotes).toBe('latest notes');
  });

  it('rejects a model action without saving or erasing an unrelated invalid draft', async () => {
    component.form.controls.regressionConstant.setValue(null);
    await component.saveFormValue();
    component.form.controls.isGeneratedModel.setValue(true);
    await component.changeModelType();
    expect(execute).not.toHaveBeenCalled();
    expect(component.form.controls.regressionConstant.value).toBeNull();
    expect(component.form.controls.isGeneratedModel.value).toBe(false);
    expect(component.autosave.dirty()).toBe(true);
  });

  it('does not start an old Generate action on a new analysis after waiting for a save', async () => {
    component.form.controls.regressionModelNotes.setValue('pending notes');
    const saving = component.saveFormValue(true);
    const generating = component.generateModels();
    selectedAnalysis.set({ ...analysis, guid: 'analysis-b' });
    pending.resolve({ value: analysis });
    await Promise.all([saving, generating]);
    expect(generate).not.toHaveBeenCalled();
    expect(applyGenerated).not.toHaveBeenCalled();
  });

  it('uses the local modeling method for predictor edits while that method is still saving', async () => {
    attachRealMenuToSelection();
    component.form.controls.isGeneratedModel.setValue(false);
    const changing = component.changeModelType();
    component.predictorVariablesArray.at(0).controls.productionInAnalysis.setValue(false);
    const toggling = component.onPredictorChange(0);
    expect(component.showConfirmPredictorChangeModel).toBe(false);
    const flushing = component.flushChanges();
    pending.resolve({ value: analysis });
    await Promise.all([changing, toggling, flushing]);
    expect(component.form.controls.regressionConstant.value).toBe(10);
    expect(component.autosave.value.values.predictorVariables[0].productionInAnalysis).toBe(false);
    await execute.mock.calls[execute.mock.calls.length - 1][1]();
    expect(update).toHaveBeenLastCalledWith('analysis-a', 'group-a', expect.objectContaining({
      predictorVariables: [{ id: 'predictor-a', productionInAnalysis: false }]
    }), 'account-a');
  });

});
