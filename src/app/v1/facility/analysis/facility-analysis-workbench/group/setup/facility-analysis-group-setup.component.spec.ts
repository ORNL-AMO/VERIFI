import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { AnalysisGroup, AnnualAnalysisSummary } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilityAnalysisBankingResultsService } from '../banking/facility-analysis-banking-results.service';
import { invalidateRegressionModel } from '../regression/regression-draft';
import { FacilityAnalysisGroupSetupComponent } from './facility-analysis-group-setup.component';
import { FacilityAnalysisGroupSetupController } from './facility-analysis-group-setup.controller';
import { FacilityAnalysisGroupSetupFacade, groupSetupDraftValid } from './facility-analysis-group-setup.facade';
import { RegressionModelValidationService } from '../regression/regression-model-validation.service';

describe('facility analysis group setup behavior', () => {
  it('clears model-derived fields without changing the selected analysis method', () => {
    const group = {
      analysisType: 'regression',
      models: [{ modelId: 'model-a' }],
      selectedModelId: 'model-a',
      dateModelsGenerated: new Date(),
      regressionModelYear: 2024,
      regressionConstant: 10,
      predictorVariables: [{ regressionCoefficient: 2 }]
    } as unknown as AnalysisGroup;

    invalidateRegressionModel(group);

    expect(group.analysisType).toBe('regression');
    expect(group).toMatchObject({
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      regressionModelYear: undefined,
      regressionConstant: undefined
    });
    expect(group.predictorVariables[0].regressionCoefficient).toBeUndefined();
  });

  it('validates all group setup fields after each edit', () => {
    const group = {
      analysisType: 'modifiedEnergyIntensity',
      predictorVariables: [{ productionInAnalysis: true }],
      specifiedMonthlyPercentBaseload: false,
      averagePercentBaseload: undefined,
      dataAdjustments: [{ year: 2024, amount: 10 }],
      baselineAdjustmentsV2: [],
      applyBanking: false
    } as AnalysisGroup;

    expect(groupSetupDraftValid(group, false)).toBe(false);
    group.averagePercentBaseload = 15;
    expect(groupSetupDraftValid(group, false)).toBe(true);
    group.applyBanking = true;
    expect(groupSetupDraftValid(group, true)).toBe(false);
    group.bankedAnalysisYear = 2024;
    group.newBaselineYear = 2025;
    expect(groupSetupDraftValid(group, true)).toBe(true);
  });

  it('requires confirmation before clearing models to unlock banking controls', () => {
    const clearModels = vi.fn();
    const group = signal({
      idbGroupId: 'group-a', analysisType: 'regression', predictorVariables: [],
      specifiedMonthlyPercentBaseload: false, monthlyPercentBaseload: [],
      dataAdjustments: [], baselineAdjustmentsV2: [], applyBanking: true,
      bankedAnalysisYear: 2022, newBaselineYear: 2024, models: [{ modelId: 'model-a' }]
    } as unknown as AnalysisGroup);
    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisGroupSetupController,
      {
        provide: FacilityAnalysisGroupSetupFacade,
        useValue: {
          group,
          hasModels: signal(true),
          bankingUnavailableReason: signal(undefined),
          changeAnalysisType: vi.fn(), setPredictorSelected: vi.fn(), clearModels,
          setLegacyBaseloadMode: vi.fn(), setAverageBaseload: vi.fn(), setApplyBanking: vi.fn(),
          setBankingYear: vi.fn(), setMonthlyBaseload: vi.fn(), setAdjustment: vi.fn()
        }
      }
    ] });
    const controller = TestBed.inject(FacilityAnalysisGroupSetupController);
    TestBed.flushEffects();

    controller.requestClearModels();
    expect(controller.pendingChange()).toEqual({ kind: 'clearModels' });
    expect(clearModels).not.toHaveBeenCalled();

    controller.confirmPendingChange();
    expect(clearModels).toHaveBeenCalledOnce();
    expect(controller.pendingChange()).toBeUndefined();
  });

  it('shows the absolute-consumption equation where production-variable controls would appear', () => {
    const fixture = renderMethodSetup('absoluteEnergyConsumption');

    const panels = fixture.nativeElement.querySelectorAll('.v1-analysis-group-setup__configuration > .v1-analysis-group-setup__panel') as NodeListOf<HTMLElement>;
    expect(panels).toHaveLength(3);
    expect(panels[1].querySelector('h2')?.textContent).toContain('Modeled energy equation');
    expect(panels[1].textContent).toContain('Modeled energy = baseline-period actual consumption');
    expect(panels[1].textContent).not.toContain('Production variables');
  });

  it('shows the classic-intensity equation beneath the production-variable selection', () => {
    const fixture = renderMethodSetup('energyIntensity');

    const productionPanel = fixture.nativeElement.querySelector('[aria-labelledby="production-variables-heading"]') as HTMLElement;
    const productionCheckbox = productionPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const equation = productionPanel.querySelector('.v1-analysis-group-setup__equation') as HTMLElement;
    expect(productionCheckbox.checked).toBe(true);
    expect(equation.textContent).toContain('Modeled energy equation');
    expect(equation.textContent).toContain('Modeled energy = baseline intensity × Production');
    expect(productionCheckbox.compareDocumentPosition(equation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the selected regression equation in the middle setup panel', () => {
    const fixture = renderMethodSetup('regression', true);

    const equationPanel = fixture.nativeElement.querySelector('[aria-labelledby="regression-equation-heading"]') as HTMLElement;
    const inspectButton = equationPanel.querySelector('button') as HTMLButtonElement;
    expect(equationPanel.textContent).toContain('Modeled energy equation');
    expect(equationPanel.textContent).toContain('Modeled energy = 10 + 2 × Production');
    expect(equationPanel.textContent).not.toContain('No model selected');
    expect(inspectButton.getAttribute('aria-label')).toBe('Inspect selected regression model');
    expect(inspectButton.querySelector('app-ui-icon')).not.toBeNull();

    inspectButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-regression-model-review-slideout')).not.toBeNull();
    expect(fixture.debugElement.injector.get(RegressionModelValidationService).inspectGenerated).toHaveBeenCalledOnce();
  });

  it('shows an explicit empty state when generated regression has no selected model', () => {
    const fixture = renderMethodSetup('regression', false);

    const equation = fixture.nativeElement.querySelector('.v1-analysis-group-setup__equation-text') as HTMLElement;
    expect(equation.textContent).toContain('No model selected.');
    expect(equation.classList).toContain('v1-analysis-group-setup__equation-text--unavailable');
    expect(fixture.nativeElement.querySelector('.v1-analysis-group-setup__inspect-model')).toBeNull();
  });

  it('renders locked banking controls with an option to clear models, warnings, and the savings preview', () => {
    const group = {
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
      specifiedMonthlyPercentBaseload: false, monthlyPercentBaseload: [],
      dataAdjustments: [{ year: 2023, amount: 10 }], baselineAdjustmentsV2: [],
      applyBanking: true, bankedAnalysisYear: 2022, newBaselineYear: 2024
    } as AnalysisGroup;
    const sourceGroup = { ...group, analysisType: 'regression', regressionModelYear: 2023, isGeneratedModel: true } as AnalysisGroup;
    const analysis = {
      guid: 'analysis-a', name: 'Current', analysisCategory: 'energy', energyUnit: 'MMBtu', waterUnit: 'gal',
      baselineYear: 2023, hasBanking: true, groups: [group]
    } as IdbAnalysisItem;
    const facade = {
      navigation: { facilityDataRoute: () => ['/v1', 'facility-data'] },
      workbench: { facility: signal({ guid: 'facility-a' }) },
      group: signal(group), analysis: signal(analysis),
      dataAdjustmentDraft: signal({ amount: '' }), baselineAdjustmentDraft: signal({ amount: '' }),
      dataAdjustmentEditorOpen: signal(true), baselineAdjustmentEditorOpen: signal(false),
      hasModels: signal(true), missingMeters: signal(false), meterStatusItems: signal([]),
      productionVariables: signal([]), selectedProductionCount: signal(0), isSkipped: signal(false),
      adjustmentYears: signal([2023, 2024]), availableDataAdjustmentYears: signal([2023, 2024]),
      availableBaselineAdjustmentYears: signal([2023, 2024]), adjustmentUnit: signal('MMBtu/yr'),
      canAddDataAdjustment: signal(false), canAddBaselineAdjustment: signal(false),
      bankingYearError: signal(undefined),
      bankingYears: signal({ appliedYears: [2021, 2022, 2023], newBaselineYears: [2023, 2024] }),
      bankingSource: signal({ name: 'Source' }), bankedGroup: signal(sourceGroup), bankingUnavailableReason: signal(undefined),
      bankingModelYearWarning: signal('The source model year (2023) is after the applied banking year (2022).'),
      removeAdjustment: vi.fn()
    };
    const controller = {
      pendingChange: signal(undefined), cancelPendingChange: vi.fn(), confirmPendingChange: vi.fn(), requestClearModels: vi.fn(),
      analysisType: new FormControl(group.analysisType, { nonNullable: true }),
      baseloadMode: new FormControl<'average' | 'monthly'>('average', { nonNullable: true }),
      averageBaseload: new FormControl<number | null>(null),
      dataAdjustmentYear: new FormControl<number | null>(null), dataAdjustmentAmount: new FormControl<number | null>(null),
      baselineAdjustmentYear: new FormControl<number | null>(null), baselineAdjustmentAmount: new FormControl<number | null>(null),
      applyBanking: new FormControl({ value: true, disabled: true }, { nonNullable: true }),
      bankedAnalysisYear: new FormControl<number | null>({ value: 2022, disabled: true }),
      newBaselineYear: new FormControl<number | null>({ value: 2024, disabled: true }),
      adjustmentControl: () => new FormControl(10, { nonNullable: true }),
      openAdjustmentEditor: vi.fn(), cancelAdjustmentEditor: vi.fn(), addAdjustment: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisGroupSetupComponent],
      providers: [
        provideRouter([]),
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
        {
          provide: FacilityAnalysisBankingResultsService,
          useValue: {
            state: signal({
              state: 'ready',
              annual: [
                { year: 2022, energyUse: 100, adjusted: 105, totalSavingsPercentImprovement: 5, annualSavingsPercentImprovement: 5, cummulativeSavings: 5 },
                { year: 2023, energyUse: 95, adjusted: 100, totalSavingsPercentImprovement: 5, annualSavingsPercentImprovement: 4, cummulativeSavings: 9 }
              ] as AnnualAnalysisSummary[]
            }),
            sourceGroup: signal(sourceGroup)
          }
        }
      ]
    });
    TestBed.overrideComponent(FacilityAnalysisGroupSetupComponent, {
      set: {
        providers: [
          { provide: FacilityAnalysisGroupSetupFacade, useValue: facade },
          { provide: FacilityAnalysisGroupSetupController, useValue: controller },
          { provide: RegressionModelValidationService, useValue: regressionValidationStub() }
        ]
      }
    });
    const fixture = TestBed.createComponent(FacilityAnalysisGroupSetupComponent);
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('#group-banking-heading') as HTMLElement;
    const checkbox = fixture.nativeElement.querySelector('.v1-analysis-group-setup__banking-heading input[type="checkbox"]') as HTMLInputElement;
    expect(heading.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    const appliedYearSelect = fixture.nativeElement.querySelector('#banked-analysis-year') as HTMLSelectElement;
    const newBaselineYearSelect = fixture.nativeElement.querySelector('#new-baseline-year') as HTMLSelectElement;
    expect(appliedYearSelect.value).not.toBe('');
    expect(appliedYearSelect.disabled).toBe(true);
    expect(appliedYearSelect.classList).toContain('v1-select');
    expect(appliedYearSelect.classList).not.toContain('form-select');
    expect(newBaselineYearSelect.value).not.toBe('');
    expect(newBaselineYearSelect.disabled).toBe(true);
    expect(newBaselineYearSelect.classList).toContain('v1-select');
    expect(newBaselineYearSelect.classList).not.toContain('form-select');
    const themedSelects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    const themedInputs = fixture.nativeElement.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    expect(Array.from(themedSelects).every(select => select.classList.contains('v1-select'))).toBe(true);
    expect(Array.from(themedSelects).every(select => !select.classList.contains('form-select'))).toBe(true);
    expect(Array.from(themedInputs).every(input => input.classList.contains('v1-input'))).toBe(true);
    expect(Array.from(themedInputs).every(input => !input.classList.contains('form-control'))).toBe(true);
    const unlockButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button: Element) => button.textContent?.includes('Clear models to edit')) as HTMLButtonElement;
    expect(unlockButton).toBeTruthy();
    unlockButton.click();
    expect(controller.requestClearModels).toHaveBeenCalledOnce();
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Optional');
    expect(text).toContain('Banking configuration');
    expect(text).toContain('Banking settings are locked because this group has a regression model');
    expect(text).toContain('source model year (2023) is after the applied banking year (2022)');
    expect(text).toContain('Banked Group Savings');
    expect(text).toContain('Transition period');
  });
});

function renderMethodSetup(method: 'absoluteEnergyConsumption' | 'energyIntensity' | 'regression', selectRegressionModel = false) {
  const predictor = {
    id: 'production-a',
    name: 'Production',
    unit: 'units',
    production: true,
    productionInAnalysis: true
  };
  const regressionModel = {
    modelId: 'model-a',
    modelYear: 2024,
    coef: [10, 2],
    predictorVariables: [predictor]
  };
  const group = {
    idbGroupId: 'group-a',
    analysisType: method,
    predictorVariables: [predictor],
    isGeneratedModel: method === 'regression',
    selectedModelId: method === 'regression' && selectRegressionModel ? regressionModel.modelId : undefined,
    models: method === 'regression' ? [regressionModel] : undefined,
    specifiedMonthlyPercentBaseload: false,
    monthlyPercentBaseload: [],
    dataAdjustments: [],
    baselineAdjustmentsV2: [],
    applyBanking: false
  } as unknown as AnalysisGroup;
  const analysis = {
    guid: 'analysis-a',
    name: 'Current',
    analysisCategory: 'energy',
    energyUnit: 'MMBtu',
    waterUnit: 'gal',
    baselineYear: 2022,
    hasBanking: false,
    groups: [group]
  } as IdbAnalysisItem;
  const facade = {
    navigation: { facilityDataRoute: () => ['/v1', 'facility-data'] },
    workbench: { facility: signal({ guid: 'facility-a' }) },
    group: signal(group),
    analysis: signal(analysis),
    dataAdjustmentDraft: signal({ amount: '' }),
    baselineAdjustmentDraft: signal({ amount: '' }),
    dataAdjustmentEditorOpen: signal(false),
    baselineAdjustmentEditorOpen: signal(false),
    hasModels: signal(false),
    missingMeters: signal(false),
    meterStatusItems: signal([]),
    productionVariables: signal([predictor]),
    selectedProductionCount: signal(1),
    isSkipped: signal(false),
    adjustmentYears: signal([]),
    availableDataAdjustmentYears: signal([]),
    availableBaselineAdjustmentYears: signal([]),
    adjustmentUnit: signal('MMBtu/yr'),
    canAddDataAdjustment: signal(false),
    canAddBaselineAdjustment: signal(false),
    bankingYearError: signal(undefined),
    bankingYears: signal({ appliedYears: [], newBaselineYears: [] }),
    bankingSource: signal(undefined),
    bankedGroup: signal(undefined),
    bankingUnavailableReason: signal(undefined),
    bankingModelYearWarning: signal(undefined),
    removeAdjustment: vi.fn()
  };
  const controller = {
    pendingChange: signal(undefined),
    cancelPendingChange: vi.fn(),
    confirmPendingChange: vi.fn(),
    requestClearModels: vi.fn(),
    analysisType: new FormControl(method, { nonNullable: true }),
    predictorControl: () => new FormControl(true, { nonNullable: true }),
    openAdjustmentEditor: vi.fn(),
    cancelAdjustmentEditor: vi.fn(),
    addAdjustment: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [FacilityAnalysisGroupSetupComponent],
    providers: [
      provideRouter([]),
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
    ]
  });
  TestBed.overrideComponent(FacilityAnalysisGroupSetupComponent, {
    set: {
      providers: [
        { provide: FacilityAnalysisGroupSetupFacade, useValue: facade },
        { provide: FacilityAnalysisGroupSetupController, useValue: controller },
        { provide: RegressionModelValidationService, useValue: regressionValidationStub() }
      ]
    }
  });
  const fixture = TestBed.createComponent(FacilityAnalysisGroupSetupComponent);
  fixture.detectChanges();
  return fixture;
}

function regressionValidationStub() {
  return {
    state: signal({ state: 'idle' as const }),
    inspectGenerated: vi.fn(),
    clear: vi.fn(),
    retry: vi.fn()
  };
}
