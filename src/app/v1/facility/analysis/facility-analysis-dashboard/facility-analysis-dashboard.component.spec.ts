import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { FacilityAnalysisActionsService } from './facility-analysis-actions.service';
import { FacilityAnalysisWorkspaceService } from './facility-analysis-workspace.service';
import { FacilityAnalysisCard } from './facility-analysis.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AnalysisBrowseCardComponent } from './analysis-browse-card/analysis-browse-card.component';
import { AnalysisDraftSlideoutComponent } from './analysis-draft-slideout/analysis-draft-slideout.component';
import { FacilityAnalysisDashboardComponent } from './facility-analysis-dashboard.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { TemplatePortal } from '@angular/cdk/portal';

describe('FacilityAnalysisDashboardComponent', () => {
  let fixture: ComponentFixture<FacilityAnalysisDashboardComponent>;
  let component: FacilityAnalysisDashboardComponent;
  let cards: WritableSignal<FacilityAnalysisCard[]>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let actions: {
    categoryAvailable: ReturnType<typeof vi.fn>;
    activeEligibility: ReturnType<typeof vi.fn>;
    createAnalysis: ReturnType<typeof vi.fn>;
    copyAnalysis: ReturnType<typeof vi.fn>;
    setActiveAnalysis: ReturnType<typeof vi.fn>;
    deleteAnalysis: ReturnType<typeof vi.fn>;
  };
  let modalPortal: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cards = signal([makeCard('energy-a', 'Energy A', 'ready'), makeCard('water-b', 'Water B', 'warning', 'water')]);
    router = { navigate: vi.fn() };
    modalPortal = { show: vi.fn(), hide: vi.fn() };
    actions = {
      categoryAvailable: vi.fn(() => true),
      activeEligibility: vi.fn(() => ({ allowed: true })),
      createAnalysis: vi.fn(async (category: 'energy' | 'water') => makeCard('created-analysis', 'Created analysis', 'ready', category).analysis),
      copyAnalysis: vi.fn(async () => makeCard('copied-analysis', 'Copied analysis', 'ready').analysis),
      setActiveAnalysis: vi.fn(async () => undefined),
      deleteAnalysis: vi.fn(async () => undefined)
    };
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
        { provide: FacilityAnalysisActionsService, useValue: actions },
        { provide: ModalPortalService, useValue: modalPortal },
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

    component.filtersForm.controls.search.setValue('does not exist');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No analyses match these filters');
    expect(fixture.nativeElement.textContent).not.toContain('No analysesCreate');
  });

  it('filters by category and status and orders attention first', () => {
    expect(component.filteredCards().map(card => card.analysis.guid)).toEqual(['water-b', 'energy-a']);
    component.filtersForm.controls.category.setValue('energy');
    expect(component.filteredCards().map(card => card.analysis.guid)).toEqual(['energy-a']);
    component.filtersForm.controls.category.setValue('all');
    component.filtersForm.controls.status.setValue('warning');
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

  it('keeps creation open with a visible command error, then closes and navigates after retry', async () => {
    actions.createAnalysis
      .mockRejectedValueOnce(new Error('Analysis creation failed.'))
      .mockResolvedValueOnce(makeCard('created-analysis', 'Created analysis', 'ready').analysis);

    buttonByText('Add analysis').click();
    fixture.detectChanges();
    const draft = fixture.debugElement.query(By.directive(AnalysisDraftSlideoutComponent));

    draft.componentInstance.submitted.emit('energy');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.createOpen()).toBe(true);
    expect(draft.nativeElement.textContent).toContain('Analysis creation failed.');

    draft.componentInstance.submitted.emit('energy');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actions.createAnalysis).toHaveBeenCalledTimes(2);
    expect(component.createOpen()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/analysis', 'facility-a', 'created-analysis']);
  });

  it('copies an analysis from its rendered card and opens the copied workbench', async () => {
    browseCard(0).copyRequested.emit(cards()[0]);
    await fixture.whenStable();

    expect(actions.copyAnalysis).toHaveBeenCalledWith('energy-a');
    expect(router.navigate).toHaveBeenCalledWith(['/analysis', 'facility-a', 'copied-analysis']);
  });

  it('keeps active confirmation open after a command error, then closes after retry', async () => {
    actions.setActiveAnalysis
      .mockRejectedValueOnce(new Error('Active selection failed.'))
      .mockResolvedValueOnce(undefined);
    browseCard(0).activeRequested.emit(cards()[0]);
    fixture.detectChanges();

    expect(modalPortal.show.mock.calls[0][0]).toBeInstanceOf(TemplatePortal);
    await component.confirmActive();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.activeCandidate()).toBe(cards()[0]);
    expect(component.actionError()).toBe('Active selection failed.');

    await component.confirmActive();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actions.setActiveAnalysis).toHaveBeenCalledTimes(2);
    expect(component.activeCandidate()).toBeUndefined();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  it('blocks deletion while downstream blockers remain', () => {
    const blocked = {
      ...makeCard('blocked-analysis', 'Blocked analysis', 'ready'),
      linkedReports: [{ guid: 'report-a', name: 'Annual report' }] as any,
      dependencyCount: 1
    };
    cards.set([blocked]);
    fixture.detectChanges();

    browseCard(0).deleteRequested.emit(blocked);
    fixture.detectChanges();

    void component.confirmDelete();
    expect(actions.deleteAnalysis).not.toHaveBeenCalled();
  });

  it('keeps deletion open after a command error, then closes after retry', async () => {
    actions.deleteAnalysis
      .mockRejectedValueOnce(new Error('Analysis deletion failed.'))
      .mockResolvedValueOnce(undefined);
    browseCard(0).deleteRequested.emit(cards()[0]);
    fixture.detectChanges();

    expect(modalPortal.show.mock.calls[0][0]).toBeInstanceOf(TemplatePortal);
    await component.confirmDelete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.deleteCandidate()).toBe(cards()[0]);
    expect(component.actionError()).toBe('Analysis deletion failed.');

    await component.confirmDelete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actions.deleteAnalysis).toHaveBeenCalledTimes(2);
    expect(component.deleteCandidate()).toBeUndefined();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  function browseCard(index: number): AnalysisBrowseCardComponent {
    return fixture.debugElement.queryAll(By.directive(AnalysisBrowseCardComponent))[index].componentInstance;
  }

  function buttonByText(label: string): HTMLButtonElement {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(item => item.textContent?.replace(/\s+/g, ' ').trim() === label);
    if (!button) throw new Error(`Button not found: ${label}`);
    return button;
  }

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
