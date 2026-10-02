import { TemplatePortal } from '@angular/cdk/portal';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { RegressionModelValidationService } from './regression-model-validation.service';
import { FacilityAnalysisRegressionComponent, buildUserDefinedGroup, generatedConfigurationValid, modelRangeMonthCount } from './facility-analysis-regression.component';
import { RegressionCandidateStore } from './regression-candidate.store';

describe('facility analysis regression behavior', () => {
  it('requires at least twelve inclusive months for model generation', () => {
    expect(modelRangeMonthCount({
      regressionModelStartMonth: 0,
      regressionStartYear: 2024,
      regressionModelEndMonth: 11,
      regressionEndYear: 2024
    } as AnalysisGroup)).toBe(12);
    expect(modelRangeMonthCount({
      regressionModelStartMonth: 5,
      regressionStartYear: 2024,
      regressionModelEndMonth: 4,
      regressionEndYear: 2025
    } as AnalysisGroup)).toBe(12);
    expect(modelRangeMonthCount({
      regressionModelStartMonth: 1,
      regressionStartYear: 2024,
      regressionModelEndMonth: 10,
      regressionEndYear: 2024
    } as AnalysisGroup)).toBe(10);
  });

  it('returns zero for incomplete ranges', () => {
    expect(modelRangeMonthCount({ regressionStartYear: 2024 } as AnalysisGroup)).toBe(0);
  });

  it('allows generated models without a custom model period', () => {
    expect(generatedConfigurationValid({
      maxModelVariables: 1,
      predictorVariables: [{ productionInAnalysis: true }]
    } as AnalysisGroup)).toBe(true);
    expect(generatedConfigurationValid({
      maxModelVariables: 2,
      predictorVariables: [{ productionInAnalysis: true }]
    } as AnalysisGroup)).toBe(false);
  });

  it.each([
    {
      name: 'calendar year',
      facility: { fiscalYear: 'calendarYear' as const, fiscalYearMonth: 0, fiscalYearCalendarEnd: true },
      expectedRange: [0, 2024, 11, 2024]
    },
    {
      name: 'fiscal year labeled by its ending year',
      facility: { fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true },
      expectedRange: [6, 2023, 5, 2024]
    }
  ])('seeds a five-significant-digit user model and the $name date range', ({ facility, expectedRange }) => {
    const selectedModel = {
      modelId: 'model-1', modelYear: 2024, coef: [17485.54321, -6.8489342],
      predictorVariables: [{ id: 'weather', name: 'Weather' }]
    } as JStatRegressionModel;
    const result = buildUserDefinedGroup({
      isGeneratedModel: true,
      selectedModelId: selectedModel.modelId,
      models: [selectedModel],
      predictorVariables: [
        { id: 'weather', name: 'Weather', productionInAnalysis: true },
        { id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: 999 }
      ]
    } as AnalysisGroup, selectedModel, facility, 2022);

    expect(result.regressionConstant).toBe(17486);
    expect(result.predictorVariables[0].regressionCoefficient).toBe(-6.8489);
    expect(result.predictorVariables[1].regressionCoefficient).toBe(0);
    expect([
      result.regressionModelStartMonth,
      result.regressionStartYear,
      result.regressionModelEndMonth,
      result.regressionEndYear
    ]).toEqual(expectedRange);
    expect(result.selectedModelId).toBeUndefined();
    expect(result.models).toBeUndefined();
  });

  it('opens destructive model-setting confirmations through the shell modal portal', async () => {
    const group = signal({
      idbGroupId: 'group-1',
      isGeneratedModel: true,
      selectedModelId: 'model-1',
      maxModelVariables: 1,
      predictorVariables: [{ id: 'production', name: 'Production', productionInAnalysis: true }],
      models: [{ modelId: 'model-1' }]
    } as AnalysisGroup);
    const analysis = signal({ groups: [group()] });
    const modalPortal = { show: vi.fn(), hide: vi.fn() };
    const validation = {
      state: signal({ state: 'idle' }), scheduleUserDefined: vi.fn(), clear: vi.fn(),
      inspectGenerated: vi.fn(), retry: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [FacilityAnalysisRegressionComponent],
      providers: [
        {
          provide: FacilityAnalysisGroupContext,
          useValue: {
            group,
            groupGuid: signal('group-1'),
            meters: signal([]),
            findings: signal([]),
            autosave: { draft: analysis, update: vi.fn() },
            workbench: {
              analysisGuid: signal('analysis-1'),
              account: signal(undefined), facility: signal(undefined),
              workspace: {
                facilityMeters: signal([]), facilityMeterData: signal([]), facilityPredictorData: signal([])
              }
            }
          }
        },
        { provide: RegressionCandidateStore, useValue: { modelsFor: vi.fn(() => []), set: vi.fn(), clear: vi.fn() } },
        { provide: RegressionModelsService, useValue: { terminateCurrentWorker: vi.fn() } },
        { provide: ModalPortalService, useValue: modalPortal }
      ]
    });
    TestBed.overrideComponent(FacilityAnalysisRegressionComponent, {
      set: { providers: [{ provide: RegressionModelValidationService, useValue: validation }] }
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(FacilityAnalysisRegressionComponent);
    fixture.detectChanges();

    fixture.componentInstance.requestMethod(false);

    expect(modalPortal.show).toHaveBeenCalledOnce();
    expect(modalPortal.show.mock.calls[0][0]).toBeInstanceOf(TemplatePortal);
    fixture.componentInstance.cancelPendingConfirmation();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });
});
