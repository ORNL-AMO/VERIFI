import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { FacilityAnalysisActionsService } from '../facility-analysis-actions.service';
import { FacilityAnalysisWorkspaceService } from '../facility-analysis-workspace.service';
import { FacilityAnalysisCard } from '../facility-analysis.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisDashboardComponent } from './facility-analysis-dashboard.component';

describe('FacilityAnalysisDashboardComponent', () => {
  let fixture: ComponentFixture<FacilityAnalysisDashboardComponent>;
  let component: FacilityAnalysisDashboardComponent;
  let cards: WritableSignal<FacilityAnalysisCard[]>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cards = signal([makeCard('energy-a', 'Energy A', 'ready'), makeCard('water-b', 'Water B', 'warning', 'water')]);
    router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [FacilityAnalysisDashboardComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: FacilityAnalysisWorkspaceService, useValue: {
          account: signal({ guid: 'account-a', name: 'Account A' }),
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          cards,
          canWrite: signal(true), hasPending: signal(false), workspaceState: signal('ready'),
          workspaceError: signal(undefined), statusState: signal('ready')
        } },
        { provide: FacilityAnalysisActionsService, useValue: {
          categoryAvailable: vi.fn(() => true), activeEligibility: vi.fn(() => ({ allowed: true })),
          createAnalysis: vi.fn(), copyAnalysis: vi.fn(), setActiveAnalysis: vi.fn(), deleteAnalysis: vi.fn()
        } },
        { provide: WorkspaceNavigationService, useValue: {
          facilityAnalysisWorkbenchRoute: vi.fn((facilityGuid: string, analysisGuid: string) => ['/analysis', facilityGuid, analysisGuid])
        } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FacilityAnalysisDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders analysis cards and distinguishes filtered empty results', () => {
    expect(fixture.nativeElement.querySelector('app-ui-icon[name="analysis"]')).not.toBeNull();
    expect(getComputedStyle(fixture.nativeElement).paddingTop).not.toBe('0px');
    expect(fixture.nativeElement.textContent).toContain('Energy A');
    expect(fixture.nativeElement.textContent).toContain('Water B');

    component.search.set('does not exist');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No analyses match these filters');
    expect(fixture.nativeElement.textContent).not.toContain('No analysesCreate');
  });

  it('filters by category and status and orders attention first', () => {
    expect(component.filteredCards().map(card => card.analysis.guid)).toEqual(['water-b', 'energy-a']);
    component.setCategoryFilter('energy');
    expect(component.filteredCards().map(card => card.analysis.guid)).toEqual(['energy-a']);
    component.setCategoryFilter('all');
    component.setStatusFilter('warning');
    expect(component.filteredCards().map(card => card.analysis.guid)).toEqual(['water-b']);
  });

  it('opens canonical workbench routes and limits comparison to two analyses', () => {
    const third = makeCard('energy-c', 'Energy C', 'ready');
    cards.set([...cards(), third]);
    component.open(cards()[0]);
    component.toggleComparison(cards()[0]);
    component.toggleComparison(cards()[1]);
    component.toggleComparison(third);

    expect(router.navigate).toHaveBeenCalledWith(['/analysis', 'facility-a', 'energy-a']);
    expect(component.comparisonGuids()).toEqual(['water-b', 'energy-c']);
  });
});

function makeCard(
  guid: string,
  name: string,
  status: FacilityAnalysisCard['status'],
  category: 'energy' | 'water' = 'energy'
): FacilityAnalysisCard {
  return {
    analysis: {
      id: 1, guid, accountId: 'account-a', facilityId: 'facility-a', name, analysisCategory: category,
      energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', groups: [], baselineYear: 2020,
      hasBanking: false, bankedAnalysisItemId: undefined!, createdDate: new Date('2025-01-01'), modifiedDate: new Date('2025-01-02')
    },
    category,
    status,
    statusLabel: status === 'ready' ? 'Ready' : 'Warning',
    findings: [], groupSummaries: [], groupCount: 0, regressionCount: 0, generatedModelCount: 0,
    isActiveForReporting: false, linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
    modifiedDateLabel: 'Jan 2, 2025', modifiedSortValue: 2, searchText: `${name} ${category}`.toLocaleLowerCase(),
    attentionRank: status === 'warning' ? 1 : 3
  };
}
