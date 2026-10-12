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
  const cards = signal<readonly AccountAnalysisCard[]>([
    card('energy-a', 'Portfolio energy', 'energy', true),
    card('water-a', 'Portfolio water', 'water', false)
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccountAnalysisDashboardComponent] })
      .overrideComponent(AccountAnalysisDashboardComponent, {
        set: {
          providers: [{
            provide: AccountAnalysisDashboardResultsService,
            useValue: {
              states: signal({
                'energy-a': readyOutcome(12.5),
                'water-a': { state: 'blocked', message: 'Setup incomplete' }
              })
            }
          }]
        }
      })
      .configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: AccountAnalysisWorkspaceService,
            useValue: {
              account: signal({ guid: 'account-a', name: 'Portfolio A', selectedEnergyAnalysisId: 'energy-a' }),
              cards,
              canWrite: signal(true),
              hasPending: signal(false),
              workspaceState: signal('ready'),
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
              accountAnalysisWorkbenchRoute: (_account: string, analysis: string) => ['/analysis', analysis],
              accountAnalysisRoute: () => ['/analysis']
            }
          },
          { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
        ]
      }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AccountAnalysisDashboardComponent);
    fixture.detectChanges();
  });

  it('renders active summaries, result facts, and blocked states', () => {
    const text = fixture.nativeElement.textContent;
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

function readyOutcome(value: number): any {
  return {
    state: 'ready',
    annualAnalysisSummaries: [],
    summary: {
      annual: { periodLabel: 'FY 2025', value },
      monthly: { periodLabel: 'Jan 2026', value }
    }
  };
}
