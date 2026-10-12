import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisActionsService } from './account-analysis-actions.service';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';
import { AccountAnalysisDashboardComponent } from './account-analysis-dashboard.component';
import { AccountAnalysisWorkspaceService } from './account-analysis-workspace.service';
import { AccountAnalysisCard } from './account-analysis.models';

describe('AccountAnalysisDashboardComponent', () => {
  let fixture: ComponentFixture<AccountAnalysisDashboardComponent>;
  let navigate: ReturnType<typeof vi.fn>;
  let account: ReturnType<typeof signal<any>>;
  let workspaceState: ReturnType<typeof signal<string>>;
  let routeState: ReturnType<typeof signal<any>>;
  let resultStates: ReturnType<typeof signal<Record<string, any>>>;
  let modalShow: ReturnType<typeof vi.fn>;
  let modalHide: ReturnType<typeof vi.fn>;
  const cards = signal<readonly AccountAnalysisCard[]>([
    card('energy-a', 'Portfolio energy', 'energy', true),
    card('water-a', 'Portfolio water', 'water', false),
    card('energy-b', 'Portfolio energy alternate', 'energy', false)
  ]);

  beforeEach(async () => {
    account = signal({ guid: 'account-a', name: 'Portfolio A', selectedEnergyAnalysisId: 'energy-a' });
    workspaceState = signal('ready');
    routeState = signal({ accountGuid: 'account-a' });
    resultStates = signal({
      'energy-a': readyOutcome(12.5),
      'water-a': { state: 'blocked', message: 'Setup incomplete' },
      'energy-b': readyOutcome(9.5)
    });
    modalShow = vi.fn();
    modalHide = vi.fn();
    await TestBed.configureTestingModule({ imports: [AccountAnalysisDashboardComponent] })
      .overrideComponent(AccountAnalysisDashboardComponent, {
        set: {
          providers: [{
            provide: AccountAnalysisDashboardResultsService,
            useValue: { states: resultStates }
          }]
        }
      })
      .configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: AccountAnalysisWorkspaceService,
            useValue: {
              account,
              cards,
              canWrite: signal(true),
              hasPending: signal(false),
              workspaceState,
              workspaceError: signal(undefined),
              statusState: signal('ready')
            }
          },
          {
            provide: AccountAnalysisActionsService,
            useValue: {
              categoryAvailable: vi.fn(() => true),
              activeEligibility: vi.fn(() => ({ allowed: true })),
              createAnalysis: vi.fn(), copyAnalysis: vi.fn(), setActiveAnalysis: vi.fn(), deleteAnalysis: vi.fn()
            }
          },
          {
            provide: WorkspaceNavigationService,
            useValue: {
              routeState,
              accountAnalysisWorkbenchRoute: (_account: string, analysis: string) => ['/analysis', analysis],
              accountAnalysisRoute: () => ['/analysis']
            }
          },
          { provide: ModalPortalService, useValue: { show: modalShow, hide: modalHide } }
        ]
      }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AccountAnalysisDashboardComponent);
    fixture.detectChanges();
  });

  it('renders active summaries, result facts, and blocked states', () => {
    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('.v1-eyebrow')?.textContent.trim()).toBe('Account Analysis');
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('Portfolio A Analysis');
    expect(text).toContain('Portfolio A');
    expect(text).toContain('Active for Reporting');
    expect(text).toContain('12.5%');
    expect(text).toContain('Setup incomplete');
  });

  it('filters reactively and opens the stable account workbench route', () => {
    fixture.componentInstance.filtersForm.controls.category.setValue('water');
    fixture.detectChanges();
    const titles = [...fixture.nativeElement.querySelectorAll('.v1-resource-browse-card__title-text')]
      .map((element: Element) => element.textContent?.trim());
    expect(titles).toEqual(['Portfolio water']);

    fixture.componentInstance.open(cards()[1]);
    expect(navigate).toHaveBeenCalledWith(['/analysis', 'water-a']);
  });

  it('selects exactly two analyses from the same category for comparison', () => {
    fixture.componentInstance.toggleComparison(cards()[0]);
    fixture.componentInstance.toggleComparison(cards()[1]);
    expect(fixture.componentInstance.comparisonGuids()).toEqual(['energy-a']);
    expect(fixture.componentInstance.comparisonDisabledReason(cards()[1])).toContain('energy');

    fixture.componentInstance.toggleComparison(cards()[2]);
    expect(fixture.componentInstance.comparisonGuids()).toEqual(['energy-a', 'energy-b']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Facility analysis selections');
  });

  it('hides retained account content and clears transient state while switching accounts', () => {
    fixture.componentInstance.detailsGuid.set('energy-a');
    fixture.componentInstance.createOpen.set(true);
    fixture.componentInstance.toggleComparison(cards()[0]);
    fixture.componentInstance.filtersForm.controls.category.setValue('water');
    fixture.componentInstance.requestActive(cards()[0]);
    expect(modalShow).toHaveBeenCalledOnce();

    workspaceState.set('switching');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-data-dashboard-workspace')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Loading account analyses');
    expect(fixture.nativeElement.textContent).not.toContain('Portfolio energy');
    expect(fixture.componentInstance.detailsGuid()).toBeUndefined();
    expect(fixture.componentInstance.createOpen()).toBe(false);
    expect(fixture.componentInstance.comparisonGuids()).toEqual([]);
    expect(fixture.componentInstance.activeCandidate()).toBeUndefined();
    expect(fixture.componentInstance.filtersForm.getRawValue()).toEqual({
      search: '', category: 'all', status: 'all', sort: 'attention'
    });
    expect(modalHide).toHaveBeenCalledOnce();

    routeState.set({ accountGuid: 'account-b' });
    account.set({ guid: 'account-b', name: 'Portfolio B' });
    workspaceState.set('ready');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('Portfolio B Analysis');
  });

  it('does not render incomplete annual comparison values as valid results', () => {
    resultStates.set({
      ...resultStates(),
      'energy-a': readyOutcome(12.5, [{
        year: 2025,
        energyUse: 987654,
        adjusted: 876543,
        savings: 111111,
        annualSavingsPercentImprovement: 12,
        totalSavingsPercentImprovement: 14,
        missingPredictorValue: true
      }]),
      'energy-b': readyOutcome(9.5, [{
        year: 2025,
        energyUse: 123,
        adjusted: 120,
        savings: 3,
        annualSavingsPercentImprovement: 2,
        totalSavingsPercentImprovement: 3,
        missingPredictorValue: false
      }])
    });
    fixture.componentInstance.toggleComparison(cards()[0]);
    fixture.componentInstance.toggleComparison(cards()[2]);
    fixture.detectChanges();

    const firstResultRow = fixture.nativeElement.querySelector(
      '.v1-account-analysis-comparison__tables article:first-child tbody tr'
    );
    expect(firstResultRow.textContent).toContain('Incomplete data');
    expect(firstResultRow.textContent).not.toContain('987654');
  });
});

function card(guid: string, name: string, category: 'energy' | 'water', active: boolean): AccountAnalysisCard {
  return {
    analysis: {
      guid, name, analysisCategory: category, baselineYear: 2022,
      energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', modifiedDate: new Date('2026-01-01')
    } as any,
    category,
    status: category === 'water' ? 'error' : 'ready',
    statusLabel: category === 'water' ? 'Error' : 'Ready',
    findings: category === 'water' ? [{ id: 'error', description: 'Choose a facility analysis', severity: 'error' } as any] : [],
    isActiveForReporting: active,
    linkedReports: [],
    facilitySelections: [],
    selectionCounts: { included: 1, skipped: 0, missing: 0, invalid: 0 },
    basisLabel: category === 'water' ? 'Water' : 'Source energy',
    unitLabel: category === 'water' ? 'gal' : 'MMBtu',
    modifiedDateLabel: 'Jan 1, 2026',
    modifiedSortValue: 1,
    searchText: `${name} ${category}`.toLocaleLowerCase(),
    attentionRank: category === 'water' ? 0 : 3
  };
}

function readyOutcome(value: number, annualAnalysisSummaries: readonly any[] = []): any {
  return {
    state: 'ready',
    annualAnalysisSummaries,
    summary: {
      annual: { periodLabel: 'FY 2025', value },
      monthly: { periodLabel: 'Jan 2026', value }
    }
  };
}
