import { CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { AnalysisGroup } from '@data/models/analysis';
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

});
