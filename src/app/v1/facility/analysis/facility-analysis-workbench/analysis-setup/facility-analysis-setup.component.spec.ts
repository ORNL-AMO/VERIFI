import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { invalidateAllRegressionModels } from '../group/regression/regression-draft';
import { FacilityAnalysisPeriodService } from './facility-analysis-period.service';
import { analysisSetupDraftValid, compatibleBankingSources, FacilityAnalysisSetupComponent } from './facility-analysis-setup.component';

describe('facility analysis setup behavior', () => {
  it('clears every persisted regression selection before unlocking setup', () => {
    const analysis = {
      isAnalysisVisited: true,
      groups: [{
        models: [{ modelId: 'model-a' }], selectedModelId: 'model-a', dateModelsGenerated: new Date(),
        regressionConstant: 2, regressionModelYear: 2024,
        predictorVariables: [{ regressionCoefficient: 3 }]
      } as unknown as AnalysisGroup]
    } as IdbAnalysisItem;

    invalidateAllRegressionModels(analysis);

    expect(analysis.groups[0]).toMatchObject({
      models: undefined, selectedModelId: undefined, dateModelsGenerated: undefined,
      regressionConstant: undefined, regressionModelYear: undefined
    });
    expect(analysis.groups[0].predictorVariables[0].regressionCoefficient).toBeUndefined();
    expect(analysis.isAnalysisVisited).toBe(false);
  });

  it('offers only same-facility analyses with a compatible category and basis', () => {
    const analysis = { guid: 'current', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: true } as IdbAnalysisItem;
    const candidates = [
      analysis,
      { guid: 'match', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: true },
      { guid: 'site', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: false },
      { guid: 'water', facilityId: 'facility-a', analysisCategory: 'water', energyIsSource: true },
      { guid: 'other-facility', facilityId: 'facility-b', analysisCategory: 'energy', energyIsSource: true }
    ] as IdbAnalysisItem[];
    expect(compatibleBankingSources(analysis, candidates).map(item => item.guid)).toEqual(['match']);
  });

  it('keeps the complete setup invalid when a later banking edit fixes only its own field', () => {
    const analysis = {
      name: '', energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024,
      hasBanking: true, bankedAnalysisItemId: 'source-analysis'
    } as IdbAnalysisItem;

    expect(analysisSetupDraftValid(analysis)).toBe(false);
    analysis.name = 'Energy Analysis';
    expect(analysisSetupDraftValid(analysis)).toBe(true);
  });

  it('selects the saved baseline after complete-year options become available', () => {
    const analysis = {
      guid: 'analysis-a', facilityId: 'facility-a', name: 'Energy Analysis', analysisCategory: 'energy',
      energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024,
      hasBanking: false, groups: []
    } as IdbAnalysisItem;
    const baselineYears = signal<readonly number[]>([]);
    const update = vi.fn();
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisSetupComponent],
      providers: [
        provideRouter([]),
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            facility: signal({
              guid: 'facility-a', fiscalYear: 'calendarYear', sustainabilityQuestions: {
                energyReductionGoal: false, waterReductionGoal: false
              }
            }),
            analyses: signal([analysis]),
            meterGroups: signal([]),
            status: { items: signal([]) }
          }
        },
        { provide: FacilityAnalysisAutosaveService, useValue: { draft: signal(analysis), update } },
        {
          provide: FacilityAnalysisPeriodService,
          useValue: { baselineYears, latestCompleteYear: signal(2025) }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: { facilitySettingsRoute: () => ['/v1', 'settings'] }
        },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisSetupComponent);
    fixture.detectChanges();

    baselineYears.set([2022, 2023, 2024, 2025]);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#analysis-name') as HTMLInputElement;
    const energyUnitSelect = fixture.nativeElement.querySelector('#analysis-energy-unit') as HTMLSelectElement;
    const select = fixture.nativeElement.querySelector('#analysis-baseline-year') as HTMLSelectElement;
    expect(nameInput.classList.contains('v1-input')).toBe(true);
    expect(nameInput.classList.contains('form-control')).toBe(false);
    expect(energyUnitSelect.classList.contains('v1-select')).toBe(true);
    expect(energyUnitSelect.classList.contains('form-select')).toBe(false);
    expect(select.classList.contains('v1-select')).toBe(true);
    expect(select.classList.contains('form-select')).toBe(false);
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe('2024');
    expect(update).not.toHaveBeenCalled();

    const option2025 = Array.from(select.options).find(option => option.textContent?.trim() === '2025');
    select.value = option2025?.value ?? '';
    select.dispatchEvent(new Event('change'));

    const [mutate, options] = update.mock.calls[0];
    const updated = structuredClone(analysis);
    mutate(updated);
    expect(updated.baselineYear).toBe(2025);
    expect(options.immediate).toBe(true);
    expect(options.valid(updated)).toBe(true);
  });

  it('renders selectable, warning, and unavailable banking source cards and preserves an invalid selection', () => {
    const group = (overrides: Partial<AnalysisGroup> = {}) => ({
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [], models: [], ...overrides
    } as AnalysisGroup);
    const analysis = {
      guid: 'current', facilityId: 'facility-a', name: 'Current', analysisCategory: 'energy',
      energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024,
      hasBanking: true, bankedAnalysisItemId: 'cycle', groups: [group()]
    } as IdbAnalysisItem;
    const available = {
      ...analysis, guid: 'available', name: 'Available Source', baselineYear: 2023,
      hasBanking: false, bankedAnalysisItemId: undefined,
      groups: [
        group({
          analysisType: 'regression', selectedModelId: 'model-a', regressionModelYear: 2023,
          predictorVariables: [{
            id: 'production', name: 'Production', unit: 'units', production: true,
            productionInAnalysis: true, regressionCoefficient: 2.5
          }],
          models: [{
            modelId: 'model-a', modelYear: 2023, coef: [120, 2.5], adjust_R2: .9126,
            t: {}, f: {}, isValid: true, modelPValue: .01, modelNotes: [],
            SEPValidationPass: true, dataValidationNotes: [], modelValidationNotes: [],
            predictorVariables: [{
              id: 'production', name: 'Production', unit: 'units', production: true,
              productionInAnalysis: true, regressionCoefficient: 2.5
            }]
          }]
        }),
        group({ idbGroupId: 'group-b', analysisType: 'absoluteEnergyConsumption' })
      ]
    } as IdbAnalysisItem;
    const warning = { ...analysis, guid: 'warning', name: 'Warning Source', baselineYear: 2022, hasBanking: false, bankedAnalysisItemId: undefined };
    const cycle = { ...analysis, guid: 'cycle', name: 'Circular Source', baselineYear: 2021, bankedAnalysisItemId: analysis.guid };
    const update = vi.fn();
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisSetupComponent],
      providers: [
        provideRouter([]),
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            facility: signal({
              guid: 'facility-a', fiscalYear: 'calendarYear', sustainabilityQuestions: {
                energyReductionGoal: false, waterReductionGoal: false
              }
            }),
            analyses: signal([analysis, available, warning, cycle]),
            meterGroups: signal([
              { guid: 'group-a', name: 'Electricity' },
              { guid: 'group-b', name: 'Natural Gas' }
            ]),
            status: { items: signal([{ severity: 'warning', entity: { guid: warning.guid }, title: 'Review source model' }]) }
          }
        },
        { provide: FacilityAnalysisAutosaveService, useValue: { draft: signal(analysis), update } },
        {
          provide: FacilityAnalysisPeriodService,
          useValue: { baselineYears: signal([2024]), latestCompleteYear: signal(2025) }
        },
        { provide: WorkspaceNavigationService, useValue: { facilitySettingsRoute: () => ['/v1', 'settings'] } },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisSetupComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Available Source');
    expect(text).toContain('Available');
    expect(text).toContain('Electricity');
    expect(text).toContain('Regression');
    expect(text).toContain('Modeled energy = 120 + (2.5 × Production)');
    const regressionDetails = Array.from(
      fixture.nativeElement.querySelectorAll('.v1-analysis-setup__banking-group dl div') as NodeListOf<HTMLElement>
    ).map((detail) => ({
      label: detail.querySelector('dt')?.textContent?.trim(),
      value: detail.querySelector('dd')?.textContent?.trim()
    }));
    expect(regressionDetails).toContainEqual({ label: 'Model year', value: '2023' });
    expect(regressionDetails).toContainEqual({ label: 'Adjusted R²', value: '0.913' });
    expect(text).toContain('Natural Gas');
    expect(text).toContain('Absolute consumption');
    expect(text).not.toContain('Includes banked savings');
    const groupDetails = fixture.nativeElement.querySelector('.v1-analysis-setup__banking-details') as HTMLDetailsElement;
    expect(groupDetails.open).toBe(false);
    expect(groupDetails.querySelector('summary')?.textContent?.trim()).toBe('2 group details');
    (groupDetails.querySelector('summary') as HTMLElement).click();
    expect(groupDetails.open).toBe(true);
    expect(text).toContain('Warning Source');
    expect(text).toContain('Available with warnings: Review source model');
    expect(text).toContain('Circular Source');
    expect(text).toContain('would create a circular banking dependency');
    expect(text).toContain('selected banking source is no longer available');
    const invalidRadio = fixture.nativeElement.querySelector('.v1-analysis-setup__banking-card--unavailable input') as HTMLInputElement;
    expect(invalidRadio.checked).toBe(true);
    expect(invalidRadio.disabled).toBe(true);

    const availableRadio = fixture.nativeElement.querySelector(
      '.v1-analysis-setup__banking-sources .v1-analysis-setup__banking-card input[type="radio"]'
    ) as HTMLInputElement;
    expect(availableRadio).not.toBeNull();
    availableRadio.click();
    const [mutate] = update.mock.calls.at(-1)!;
    const updated = structuredClone(analysis);
    mutate(updated);
    expect(updated.bankedAnalysisItemId).toBe('available');
  });

  it('locks banking controls while regression models exist', () => {
    const analysis = {
      guid: 'current', facilityId: 'facility-a', name: 'Current', analysisCategory: 'energy',
      energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024,
      hasBanking: true, bankedAnalysisItemId: 'source',
      groups: [{ idbGroupId: 'group-a', analysisType: 'regression', predictorVariables: [], models: [{ modelId: 'model-a' }] }]
    } as IdbAnalysisItem;
    const source = {
      ...analysis, guid: 'source', name: 'Source', hasBanking: false, bankedAnalysisItemId: undefined,
      groups: [{ idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [], models: [] }]
    } as IdbAnalysisItem;
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisSetupComponent],
      providers: [
        provideRouter([]),
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            facility: signal({ guid: 'facility-a', fiscalYear: 'calendarYear', sustainabilityQuestions: {} }),
            analyses: signal([analysis, source]), meterGroups: signal([]), status: { items: signal([]) }
          }
        },
        { provide: FacilityAnalysisAutosaveService, useValue: { draft: signal(analysis), update: vi.fn() } },
        { provide: FacilityAnalysisPeriodService, useValue: { baselineYears: signal([2024]), latestCompleteYear: signal(2025) } },
        { provide: WorkspaceNavigationService, useValue: { facilitySettingsRoute: () => ['/v1', 'settings'] } },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisSetupComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('input[formcontrolname="hasBanking"]') as HTMLInputElement).disabled).toBe(true);
    const sourceRadio = fixture.nativeElement.querySelector(
      '.v1-analysis-setup__banking-sources .v1-analysis-setup__banking-card input[type="radio"]'
    ) as HTMLInputElement;
    expect(sourceRadio.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Banking settings are locked while regression models exist');
  });
});
