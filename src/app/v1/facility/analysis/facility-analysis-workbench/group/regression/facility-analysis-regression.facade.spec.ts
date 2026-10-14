import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisRegressionController } from './facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from './facility-analysis-regression.facade';
import { RegressionCandidateStore } from './regression-candidate.store';
import { RegressionModelValidationService } from './regression-model-validation.service';
import { UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow/user-defined-regression-workflow.component';

describe('facility analysis regression draft controls', () => {
  it('locks the end date to twelve inclusive months and updates both end fields with each start edit', async () => {
    const { group, draft, update } = await configureWorkflow(false, 2.5, -3);
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    fixture.detectChanges();
    const controller = TestBed.inject(FacilityAnalysisRegressionController);
    const element = fixture.nativeElement as HTMLElement;

    expect(controller.endMonth.disabled).toBe(true);
    expect(controller.endYear.disabled).toBe(true);
    expect(element.textContent).toContain('Selected duration: 12 months');
    expect(update).not.toHaveBeenCalled();

    controller.startMonth.setValue(6);
    fixture.detectChanges();

    expect(group()).toMatchObject({ regressionModelStartMonth: 6, regressionStartYear: 2024, regressionModelEndMonth: 5, regressionEndYear: 2025 });
    expect(controller.endMonth.value).toBe(5);
    expect(controller.endYear.value).toBe(2025);
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.lastCall![1].valid(draft())).toBe(true);

    controller.startYear.setValue(2025);
    fixture.detectChanges();

    expect(group()).toMatchObject({ regressionModelEndMonth: 5, regressionEndYear: 2026 });
    expect(controller.endYear.value).toBe(2026);
    expect(element.textContent).toContain('Selected duration: 12 months');
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('unlocks custom end dates, keeps them while changing the start, and can return to twelve months', async () => {
    const { group, update } = await configureWorkflow(false, 2.5, -3);
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    fixture.detectChanges();
    const controller = TestBed.inject(FacilityAnalysisRegressionController);
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-user-regression__range-toggle')!;

    toggle.click();
    fixture.detectChanges();

    expect(controller.endMonth.disabled).toBe(false);
    expect(controller.endYear.disabled).toBe(false);
    expect(update).not.toHaveBeenCalled();
    controller.endYear.setValue(2025);
    fixture.detectChanges();
    expect(element.textContent).toContain('Selected duration: 24 months');
    controller.startMonth.setValue(6);
    fixture.detectChanges();
    expect(group()).toMatchObject({ regressionModelEndMonth: 11, regressionEndYear: 2025 });
    expect(element.textContent).toContain('Selected duration: 18 months');

    toggle.click();
    fixture.detectChanges();

    expect(controller.endMonth.disabled).toBe(true);
    expect(controller.endYear.disabled).toBe(true);
    expect(group()).toMatchObject({ regressionModelEndMonth: 5, regressionEndYear: 2025 });
    expect(element.textContent).toContain('Selected duration: 12 months');
    expect(group().regressionConstant).toBe(2);
    expect(group().predictorVariables.map(variable => variable.regressionCoefficient)).toEqual([2.5, -3]);
  });

  it('preserves an existing custom period on hydration and still validates the twelve-month minimum', async () => {
    const { group, draft, update } = await configureWorkflow(false, 2.5, -3);
    draft.update(analysis => ({ ...analysis, groups: [{ ...analysis.groups[0], regressionEndYear: 2025 }] }));
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    fixture.detectChanges();
    const controller = TestBed.inject(FacilityAnalysisRegressionController);
    const element = fixture.nativeElement as HTMLElement;

    expect(group().regressionEndYear).toBe(2025);
    expect(controller.endYear.disabled).toBe(false);
    expect(element.textContent).toContain('Selected duration: 24 months');
    expect(update).not.toHaveBeenCalled();

    controller.endYear.setValue(2024);
    controller.endMonth.setValue(10);
    fixture.detectChanges();

    expect(element.textContent).toContain('Selected duration: 11 months');
    expect(element.textContent).toContain('Select at least 12 complete months.');
    expect(update.mock.lastCall![1].valid(draft())).toBe(false);
    expect(controller.endMonth.disabled).toBe(false);
  });

  it.each([[0, -3], [2.5, 4]])('retains user-defined coefficients %s and %s when toggling off and on', async (productionCoefficient, weatherCoefficient) => {
    const { group, draft, update, validation } = await configureWorkflow(false, productionCoefficient, weatherCoefficient);
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const productionToggle = element.querySelector<HTMLInputElement>('#user-predictor-production')!;
    const weatherToggle = element.querySelector<HTMLInputElement>('#user-predictor-weather')!;
    const productionInput = element.querySelector<HTMLInputElement>('#coefficient-production')!;
    const weatherInput = element.querySelector<HTMLInputElement>('#coefficient-weather')!;
    const constantInput = element.querySelector<HTMLInputElement>('#regression-constant')!;
    const equation = element.querySelector<HTMLElement>('.v1-user-regression__equation')!;
    const original = structuredClone(group());

    productionToggle.click();
    fixture.detectChanges();

    expect(group().predictorVariables[0].productionInAnalysis).toBe(false);
    expect(productionInput.disabled).toBe(true);
    expect(productionInput.value).toBe(String(productionCoefficient));
    expect(weatherInput.value).toBe(String(weatherCoefficient));
    expect(constantInput.value).toBe('2');
    expect(equation.textContent).not.toContain('Production');
    expect(equation.textContent).toContain(`2 + (${weatherCoefficient} × Weather)`);
    expect(update.mock.lastCall![1].valid(draft())).toBe(true);
    expect(validation.scheduleUserDefined).toHaveBeenLastCalledWith(group());

    weatherToggle.click();
    fixture.detectChanges();

    expect(update.mock.lastCall![1].valid(draft())).toBe(false);
    expect(element.textContent).toContain('Select at least one predictor.');
    expect(group().regressionConstant).toBe(original.regressionConstant);
    expect(group().predictorVariables.map(variable => variable.regressionCoefficient))
      .toEqual([productionCoefficient, weatherCoefficient]);

    weatherToggle.click();
    productionToggle.click();
    fixture.detectChanges();

    expect(productionInput.disabled).toBe(false);
    expect(productionInput.value).toBe(String(productionCoefficient));
    expect(weatherInput.value).toBe(String(weatherCoefficient));
    expect(equation.textContent).toContain(`2 + (${productionCoefficient} × Production) + (${weatherCoefficient} × Weather)`);
    expect(group()).toEqual({ ...original, maxModelVariables: 1 });
    expect(update.mock.lastCall![1].valid(draft())).toBe(true);
    expect(validation.scheduleUserDefined).toHaveBeenLastCalledWith(group());
  });

  it('still confirms and clears a generated equation when changing its predictors', async () => {
    const { group, draft, update, candidates } = await configureWorkflow(true, 2.5, -3);
    const controller = TestBed.inject(FacilityAnalysisRegressionController);
    TestBed.tick();

    controller.predictorControl('production').setValue(false);

    expect(controller.pendingChange()).toEqual({ kind: 'predictor', predictorId: 'production', selected: false });
    expect(group().selectedModelId).toBe('model-1');
    expect(update).not.toHaveBeenCalled();

    controller.confirmPendingChange();
    TestBed.tick();

    expect(group()).toMatchObject({
      isGeneratedModel: true,
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      regressionModelYear: undefined,
      regressionConstant: undefined,
      maxModelVariables: 1,
      predictorVariables: [
        { productionInAnalysis: false, regressionCoefficient: undefined },
        { productionInAnalysis: true, regressionCoefficient: undefined }
      ]
    });
    expect(candidates.modelsFor('analysis-1', 'group-1')).toEqual([]);
    expect(update.mock.lastCall![1].valid(draft())).toBe(true);
  });
});

async function configureWorkflow(generated: boolean, productionCoefficient: number, weatherCoefficient: number) {
  const draft = signal({
    guid: 'analysis-1', analysisCategory: 'energy', baselineYear: 2024,
    groups: [{
      idbGroupId: 'group-1', isGeneratedModel: generated, maxModelVariables: 2,
      regressionConstant: 2, regressionModelYear: 2024, regressionModelNotes: 'Keep this equation',
      regressionModelStartMonth: 0, regressionStartYear: 2024,
      regressionModelEndMonth: 11, regressionEndYear: 2024,
      ...(generated ? {
        selectedModelId: 'model-1', dateModelsGenerated: new Date('2024-01-01'),
        models: [{ modelId: 'model-1' } as JStatRegressionModel]
      } : {}),
      predictorVariables: [
        { id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: productionCoefficient },
        { id: 'weather', name: 'Weather', productionInAnalysis: true, regressionCoefficient: weatherCoefficient }
      ]
    } as AnalysisGroup]
  } as IdbAnalysisItem);
  const group = computed(() => draft().groups[0]);
  const update = vi.fn((mutator: (analysis: IdbAnalysisItem) => void,
    options: { immediate: boolean; valid: (analysis: IdbAnalysisItem) => boolean }) => {
    const next = structuredClone(draft());
    mutator(next);
    draft.set(next);
  });
  const validation = {
    state: signal({ state: 'idle', source: 'user-defined' }),
    scheduleUserDefined: vi.fn(), clear: vi.fn(), retry: vi.fn()
  };
  await TestBed.configureTestingModule({
    imports: [UserDefinedRegressionWorkflowComponent],
    providers: [
      FacilityAnalysisRegressionFacade, FacilityAnalysisRegressionController, RegressionCandidateStore,
      { provide: RegressionModelsService, useValue: {} },
      { provide: RegressionModelValidationService, useValue: validation },
      {
        provide: FacilityAnalysisGroupContext,
        useValue: {
          group, groupGuid: signal('group-1'), meters: signal([]), findings: signal([]),
          autosave: { draft, update },
          workbench: {
            analysisGuid: signal('analysis-1'), account: signal(undefined), facility: signal(undefined),
            workspace: { facilityMeterData: signal([]), facilityPredictorData: signal([]) }
          }
        }
      }
    ]
  }).compileComponents();
  return { group, draft, update, validation, candidates: TestBed.inject(RegressionCandidateStore) };
}
