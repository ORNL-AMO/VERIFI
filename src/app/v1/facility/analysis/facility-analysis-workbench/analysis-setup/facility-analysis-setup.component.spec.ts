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
import { compatibleBankingSources, FacilityAnalysisSetupComponent } from './facility-analysis-setup.component';

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
            analyses: signal([analysis])
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

    const select = fixture.nativeElement.querySelector('#analysis-baseline-year') as HTMLSelectElement;
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe('2024');
    expect(update).not.toHaveBeenCalled();

    const option2025 = Array.from(select.options).find(option => option.textContent?.trim() === '2025');
    select.value = option2025?.value ?? '';
    select.dispatchEvent(new Event('change'));

    const [mutate, options] = update.mock.calls[0];
    const updated = structuredClone(analysis);
    mutate(updated);
    expect(updated.baselineYear).toBe(2025);
    expect(options).toEqual({ immediate: true, valid: true });
  });
});
