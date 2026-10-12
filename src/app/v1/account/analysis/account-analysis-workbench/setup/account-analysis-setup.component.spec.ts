import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisPeriodService } from './account-analysis-period.service';
import { AccountAnalysisSetupActionsService } from './account-analysis-setup-actions.service';
import { accountAnalysisSetupDraftValid, AccountAnalysisSetupComponent } from './account-analysis-setup.component';

describe('AccountAnalysisSetupComponent', () => {
  const analysis = {
    guid: 'analysis-a', accountId: 'account-a', name: 'Portfolio Energy', analysisCategory: 'energy',
    baselineYear: 2024, energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
    facilityAnalysisItems: [], hasBanking: false, isAnalysisVisited: false
  } as IdbAccountAnalysisItem;

  afterEach(() => TestBed.resetTestingModule());

  it('renders account settings, complete-year context, goal guidance, and the bulk action', () => {
    const draft = signal(structuredClone(analysis));
    configure(draft);
    const fixture = TestBed.createComponent(AccountAnalysisSetupComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Analysis boundary');
    expect(text).toContain('Latest complete year');
    expect(text).toContain('account energy goal baseline (2023)');
    expect(text).toContain('Create facility analyses');
    expect(fixture.nativeElement.querySelector('#account-analysis-energy-unit.v1-select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#account-analysis-baseline-year.v1-select')).toBeTruthy();
  });

  it('locks calculation settings while keeping the name editable after a facility selection', () => {
    const selected = structuredClone(analysis);
    selected.facilityAnalysisItems = [{ facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' }];
    const draft = signal(selected);
    configure(draft);
    const fixture = TestBed.createComponent(AccountAnalysisSetupComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.name.enabled).toBe(true);
    expect(fixture.componentInstance.form.controls.energyIsSource.disabled).toBe(true);
    expect(fixture.componentInstance.form.controls.energyUnit.disabled).toBe(true);
    expect(fixture.componentInstance.form.controls.baselineYear.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Calculation settings are locked');
    expect(fixture.nativeElement.textContent).toContain('Clear selections to edit');
  });

  it('renders the category-specific water unit without an energy boundary control', () => {
    const water = structuredClone(analysis);
    water.analysisCategory = 'water';
    water.name = 'Portfolio Water';
    const draft = signal(water);
    configure(draft);
    const fixture = TestBed.createComponent(AccountAnalysisSetupComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#account-analysis-water-unit.v1-select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#account-analysis-energy-unit')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Analysis boundary');
  });

  it('validates setup readiness from a nonblank name and finite baseline', () => {
    expect(accountAnalysisSetupDraftValid(analysis)).toBe(true);
    expect(accountAnalysisSetupDraftValid({ ...analysis, name: '   ' })).toBe(false);
    expect(accountAnalysisSetupDraftValid({ ...analysis, baselineYear: Number.NaN })).toBe(false);
  });

  it('marks result status stale when an editable setup value changes', () => {
    const draft = signal({ ...structuredClone(analysis), isAnalysisVisited: true });
    const { update } = configure(draft);
    const fixture = TestBed.createComponent(AccountAnalysisSetupComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.name.setValue('Renamed analysis');
    const mutator = update.mock.calls[0][0] as (item: IdbAccountAnalysisItem) => void;
    const changed = structuredClone(draft());
    mutator(changed);

    expect(changed.name).toBe('Renamed analysis');
    expect(changed.isAnalysisVisited).toBe(false);
  });

  function configure(draft: ReturnType<typeof signal<IdbAccountAnalysisItem>>) {
    const period = {
      state: signal('ready'), error: signal(undefined), baselineYears: signal([2023, 2024]),
      latestCompleteYear: signal(2024), currentBaselineUnavailable: signal(false)
    };
    const actions = {
      busy: signal(false), error: signal(undefined), clearError: vi.fn(),
      clearSelections: vi.fn().mockResolvedValue(true), createBulkFacilityAnalyses: vi.fn().mockResolvedValue(true)
    };
    const update = vi.fn();
    TestBed.overrideComponent(AccountAnalysisSetupComponent, {
      set: {
        providers: [
          { provide: AccountAnalysisPeriodService, useValue: period },
          { provide: AccountAnalysisSetupActionsService, useValue: actions }
        ]
      }
    });
    TestBed.configureTestingModule({
      imports: [AccountAnalysisSetupComponent],
      providers: [
        provideRouter([]),
        {
          provide: AccountAnalysisWorkbenchContext,
          useValue: {
            account: signal({
              guid: 'account-a', fiscalYear: 'calendarYear',
              sustainabilityQuestions: {
                energyReductionGoal: true, energyReductionBaselineYear: 2023,
                waterReductionGoal: false, waterReductionBaselineYear: 2020
              }
            }),
            linkedReports: signal([])
          }
        },
        {
          provide: AccountAnalysisAutosaveService,
          useValue: {
            draft, state: signal('saved'), flush: vi.fn().mockResolvedValue(true),
            update, error: signal(undefined)
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: { accountSettingsRoute: (_guid: string, tab: string) => ['/settings', tab] }
        },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
      ]
    });
    return { update, actions, period };
  }
});
