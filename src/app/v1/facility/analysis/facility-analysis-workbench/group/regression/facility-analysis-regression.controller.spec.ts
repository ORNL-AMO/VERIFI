import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { ANALYSIS_AUTOSAVE_DEBOUNCE_MS, FacilityAnalysisAutosaveService } from '../../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../../facility-analysis-workbench-context.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisRegressionController } from './facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from './facility-analysis-regression.facade';
import { RegressionCandidateStore } from './regression-candidate.store';
import { RegressionModelValidationService } from './regression-model-validation.service';
import { UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow/user-defined-regression-workflow.component';

describe('regression end-date lock with autosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it.each([2024, 2025])('restores the saved period and lock after discarding a failed edit with end year %s', async endYear => {
    const { fixture, autosave, controller, execute } = await configureWorkflow(endYear);
    const savedGroup = structuredClone(autosave.draft()!.groups[0]);
    const update = vi.spyOn(autosave, 'update');
    execute.mockRejectedValueOnce(new Error('Disk unavailable'));

    controller.toggleEndDateLock();
    if (endYear === 2024) controller.endYear.setValue(2025);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS);
    fixture.detectChanges();

    expect(autosave.state()).toBe('error');
    expect(controller.endDateLocked()).toBe(endYear !== 2024);
    update.mockClear();
    autosave.discard();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(autosave.draft()!.groups[0]).toEqual(savedGroup);
    expect(controller.endDateLocked()).toBe(endYear === 2024);
    expect(element.querySelector<HTMLSelectElement>('#model-end-month')!.disabled).toBe(endYear === 2024);
    expect(element.querySelector<HTMLSelectElement>('#model-end-year')!.disabled).toBe(endYear === 2024);
    expect(update).not.toHaveBeenCalled();

    controller.startMonth.setValue(6);
    fixture.detectChanges();

    expect(autosave.draft()!.groups[0]).toMatchObject({
      regressionModelStartMonth: 6,
      regressionModelEndMonth: endYear === 2024 ? 5 : 11,
      regressionEndYear: 2025
    });
    expect(update).toHaveBeenCalledOnce();
  });

  it('keeps an unlocked twelve-month period unlocked through ordinary edits and successful saves', async () => {
    const { fixture, autosave, controller } = await configureWorkflow(2024);
    controller.toggleEndDateLock();
    controller.constant.setValue(3);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS);
    fixture.detectChanges();

    expect(autosave.state()).toBe('saved');
    expect(controller.endDateLocked()).toBe(false);
    expect(controller.endYear.disabled).toBe(false);

    controller.startMonth.setValue(6);
    fixture.detectChanges();
    expect(autosave.draft()!.groups[0]).toMatchObject({ regressionModelEndMonth: 11, regressionEndYear: 2024 });
  });

  it('reinitializes the same controller when its analysis and group context are reset', async () => {
    const { fixture, analysis, autosave, controller } = await configureWorkflow(2025);
    const saved = structuredClone(analysis()!);
    controller.toggleEndDateLock();
    fixture.detectChanges();
    expect(controller.endDateLocked()).toBe(true);

    fixture.destroy();
    analysis.set(undefined);
    TestBed.tick();
    analysis.set(saved);
    TestBed.tick();

    expect(autosave.draft()!.groups[0]).toEqual(saved.groups[0]);
    expect(controller.endDateLocked()).toBe(false);
    expect(controller.endMonth.disabled).toBe(false);
    expect(controller.endYear.disabled).toBe(false);
  });
});

async function configureWorkflow(endYear: number) {
  const analysis = signal<IdbAnalysisItem | undefined>({
    guid: 'analysis-1', accountId: 'account-1', analysisCategory: 'energy', baselineYear: 2024,
    groups: [{
      idbGroupId: 'group-1', isGeneratedModel: false, maxModelVariables: 1,
      regressionConstant: 2, regressionModelYear: 2024,
      regressionModelStartMonth: 0, regressionStartYear: 2024,
      regressionModelEndMonth: 11, regressionEndYear: endYear,
      predictorVariables: [{ id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: 3 }]
    } as AnalysisGroup]
  } as IdbAnalysisItem);
  const workbench = {
    analysis, analysisGuid: signal('analysis-1'), account: signal({ guid: 'account-1' }), facility: signal(undefined),
    workspace: { facilityMeterData: signal([]), facilityPredictorData: signal([]) }
  };
  const execute = vi.fn(async (_options, persist: () => Promise<{ analysis: IdbAnalysisItem }>) => {
    const value = await persist();
    analysis.set(value.analysis);
    return { value };
  });
  await TestBed.configureTestingModule({
    imports: [UserDefinedRegressionWorkflowComponent],
    providers: [
      FacilityAnalysisAutosaveService, FacilityAnalysisRegressionFacade, FacilityAnalysisRegressionController,
      RegressionCandidateStore, UnsavedChangesService,
      { provide: FacilityAnalysisWorkbenchContext, useValue: workbench },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: {
        updateFacilityAnalysisWithSingleSitePair: vi.fn(async (item: IdbAnalysisItem) => ({ analysis: structuredClone(item) }))
      } },
      { provide: RegressionModelsService, useValue: {} },
      { provide: RegressionModelValidationService, useValue: {
        state: signal({ state: 'idle', source: 'user-defined' }), scheduleUserDefined: vi.fn(), clear: vi.fn(), retry: vi.fn()
      } },
      { provide: FacilityAnalysisGroupContext, useFactory: (autosave: FacilityAnalysisAutosaveService) => ({
        autosave, workbench, group: computed(() => autosave.draft()?.groups[0]),
        groupGuid: signal('group-1'), meters: signal([]), findings: signal([])
      }), deps: [FacilityAnalysisAutosaveService] }
    ]
  }).compileComponents();
  const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
  fixture.detectChanges();
  return {
    fixture, analysis, execute,
    autosave: TestBed.inject(FacilityAnalysisAutosaveService),
    controller: TestBed.inject(FacilityAnalysisRegressionController)
  };
}
