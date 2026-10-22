import { Component, computed, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { FacilityAnalysisActionsService } from './facility-analysis-actions.service';
import { FacilityAnalysisWorkspaceService } from './facility-analysis-workspace.service';
import { FacilityAnalysisCard } from './facility-analysis.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { LocalStorageService } from 'ngx-webstorage';
import { AnalysisDraftSlideoutComponent } from './analysis-draft-slideout/analysis-draft-slideout.component';
import { FacilityAnalysisDashboardComponent } from './facility-analysis-dashboard.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { FacilityAnalysisDashboardResultsService } from './facility-analysis-dashboard-results.service';
import { FacilityAnalysisComparisonComponent } from './facility-analysis-comparison/facility-analysis-comparison.component';
import { StatusEvaluationState } from '@app/v1/status/status.models';

describe('FacilityAnalysisDashboardComponent', () => {
  let fixture: ComponentFixture<FacilityAnalysisDashboardComponent>;
  let component: FacilityAnalysisDashboardComponent;
  let cards: WritableSignal<FacilityAnalysisCard[]>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let facility: ReturnType<typeof signal<any>>;
  let route: ReturnType<typeof signal<any>>;
  let singleSite: ReturnType<typeof signal<boolean>>;
  let categories: ReturnType<typeof signal<readonly ('energy' | 'water')[]>>;
  let statusState: WritableSignal<StatusEvaluationState>;
  let results: { states: ReturnType<typeof signal<any>>; setDemand: ReturnType<typeof vi.fn> };
  let storage: { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
  let actions: {
    categoryAvailable: ReturnType<typeof vi.fn>;
    activeEligibility: ReturnType<typeof vi.fn>;
    createAnalysis: ReturnType<typeof vi.fn>;
    copyAnalysis: ReturnType<typeof vi.fn>;
    setActiveAnalysis: ReturnType<typeof vi.fn>;
    deleteAnalysis: ReturnType<typeof vi.fn>;
  };
  let modalPortal: { activePortal: ReturnType<typeof signal<any>>; show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cards = signal([makeCard('energy-a', 'Energy A', 'ready'), makeCard('water-b', 'Water B', 'warning', 'water')]);
    facility = signal({ guid: 'facility-a', accountId: 'account-a', name: 'Facility A' });
    route = signal({ facilityGuid: 'facility-a' }); singleSite = signal(false);
    categories = signal<readonly ('energy' | 'water')[]>(['energy', 'water']);
    statusState = signal<StatusEvaluationState>('ready');
    storage = { retrieve: vi.fn(() => null), store: vi.fn() };
    results = { states: signal({ 'energy-a': readyOutcome(2025, 8.75, new Date(2026, 7, 1), 7.9), 'water-b': { state: 'blocked', message: 'Setup incomplete' } }), setDemand: vi.fn() };
    modalPortal = { activePortal: signal(null), show: vi.fn(portal => modalPortal.activePortal.set(portal)), hide: vi.fn(() => modalPortal.activePortal.set(null)) };
    actions = {
      categoryAvailable: vi.fn(() => true),
      activeEligibility: vi.fn(() => ({ allowed: true })),
      createAnalysis: vi.fn(async (category: 'energy' | 'water') => makeCard('created-analysis', 'Created analysis', 'ready', category).analysis),
      copyAnalysis: vi.fn(async () => makeCard('copied-analysis', 'Copied analysis', 'ready').analysis),
      setActiveAnalysis: vi.fn(async () => undefined),
      deleteAnalysis: vi.fn(async () => undefined)
    };
    TestBed.overrideComponent(FacilityAnalysisDashboardComponent, {
      set: {
        providers: [{
          provide: FacilityAnalysisDashboardResultsService,
          useValue: results
        }]
      }
    });
    TestBed.overrideComponent(FacilityAnalysisDashboardComponent, {
      remove: { imports: [FacilityAnalysisComparisonComponent] },
      add: { imports: [FacilityAnalysisComparisonStubComponent] }
    });
    await TestBed.configureTestingModule({
      imports: [FacilityAnalysisDashboardComponent],
      providers: [
        provideRouter([]), { provide: LocalStorageService, useValue: storage },
        { provide: FacilityAnalysisWorkspaceService, useValue: {
          account: signal({ guid: 'account-a', name: 'Account A' }),
          facility, categories,
          cards, analyses: computed(() => cards().map(card => card.analysis)), meterGroups: signal([]),
          canWrite: signal(true), hasPending: signal(false), workspaceState: signal('ready'),
          workspaceError: signal(undefined), statusState
        } },
        { provide: FacilityAnalysisActionsService, useValue: actions },
        { provide: ModalPortalService, useValue: modalPortal },
        { provide: WorkspaceNavigationService, useValue: {
          routeState: route, isSingleSiteWorkspace: singleSite,
          accountAnalysisRoute: (id: string) => ['/account', id, 'analysis'],
          facilityAnalysisRoute: (id: string) => ['/facility', id, 'analysis'],
          facilityAnalysisWorkbenchRoute: vi.fn((facilityGuid: string, analysisGuid: string) => ['/analysis', facilityGuid, analysisGuid])
        } }
      ]
    }).compileComponents();
    router = { navigate: vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) };
    fixture = TestBed.createComponent(FacilityAnalysisDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders analysis cards and distinguishes filtered empty results', () => {
    expect(component.breadcrumbs()).toEqual([{ label: 'Account A', route: ['/account', 'account-a', 'analysis'] }, { label: 'Facility A' }]);
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('Analysis');
    expect(fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.portfolio-tile__owner')).toBeNull();
    expect(component.inventory.detail()).toBe('summary');
    expect(fixture.nativeElement.textContent).toContain('8.75%');
    expect(component.resultDemand()).toEqual(['energy-a', 'water-b']);
    expect(fixture.nativeElement.textContent).toContain('Energy A');
    expect(fixture.nativeElement.textContent).toContain('Water B');

    component.filtersForm.controls.search.setValue('does not exist');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No analyses match these filters');
    expect(fixture.nativeElement.textContent).not.toContain('No analysesCreate');
  });

  it('filters by category and status and orders attention first', () => {
    expect(component.filteredEntries().map(entry => entry.card.analysis.guid)).toEqual(['water-b', 'energy-a']);
    component.filtersForm.controls.category.setValue('energy');
    expect(component.filteredEntries().map(entry => entry.card.analysis.guid)).toEqual(['energy-a']);
    component.filtersForm.controls.category.setValue('all');
    component.filtersForm.controls.status.setValue('warning');
    expect(component.filteredEntries().map(entry => entry.card.analysis.guid)).toEqual(['water-b']);
  });

  it('shows outcome snapshots on summary cards and mirrors model context in Details', () => {
    component.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Latest full year · 2025');
    expect(fixture.nativeElement.textContent).toContain('8.75%');
    expect(fixture.nativeElement.textContent).toContain('Setup incomplete');

    grid().actionRequested.emit({ guid: 'facility:energy-a', action: 'details' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Analysis groups and models');
    expect(fixture.nativeElement.textContent).toContain('No analysis groups are configured.');
    expect(fixture.nativeElement.textContent).toContain('Latest month · Aug 2026');
  });

  it('expands individual cards and clears overrides on global detail changes', () => {
    component.inventory.detailControl.setValue('simple'); fixture.detectChanges();
    grid().detailChanged.emit({ guid: 'facility:energy-a', level: 'detailed' }); fixture.detectChanges();
    expect(component.resultDemand()).toEqual(['energy-a']);
    expect(fixture.nativeElement.textContent).toContain('Group Details');
    expect(fixture.nativeElement.textContent).toContain('Used By');
    component.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(component.inventory.overrides()).toEqual({});
    expect(component.resultDemand()).toEqual(['energy-a', 'water-b']);
    expect(fixture.nativeElement.textContent).not.toContain('Group Details');
  });

  it('paginates after filtering, retains the page on detail changes, and clamps deletion', () => {
    cards.set(Array.from({ length: 50 }, (_, i) => makeCard(`item-${i}`, `Analysis ${i}`, 'ready'))); fixture.detectChanges();
    expect(component.inventory.visibleTiles()).toHaveLength(24);
    component.inventory.selectPage(2); component.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(component.inventory.page()).toBe(2); expect(component.resultDemand()).toHaveLength(2);
    cards.update(items => items.slice(0, 25)); fixture.detectChanges();
    expect(component.inventory.page()).toBe(1);
    component.filtersForm.controls.search.setValue('Analysis 0'); fixture.detectChanges();
    expect(component.inventory.page()).toBe(0); expect(component.filteredEntries()).toHaveLength(1);
  });

  it.each(['idle', 'evaluating'] as const)('preserves the page on return while validation is %s, then clamps settled deletions', pendingState => {
    const validCards = Array.from({ length: 50 }, (_, i) => makeCard(`item-${i}`, `Analysis ${i}`, 'ready'));
    cards.set(validCards); component.filtersForm.controls.status.setValue('ready'); fixture.detectChanges();
    component.inventory.selectPage(1);
    component.inventory.setTileDetail({ guid: 'facility:item-25', level: 'detailed' }); fixture.detectChanges();

    statusState.set(pendingState);
    cards.set(validCards.map(card => ({ ...card, status: 'evaluating' }))); fixture.detectChanges();
    expect(component.filteredEntries()).toHaveLength(0);
    expect(component.inventory.page()).toBe(1);

    fixture.destroy();
    fixture = TestBed.createComponent(FacilityAnalysisDashboardComponent);
    component = fixture.componentInstance; fixture.detectChanges();
    expect(component.filters().status).toBe('ready');
    expect(component.inventory.page()).toBe(1);

    cards.set(validCards); statusState.set('ready'); fixture.detectChanges();
    expect(component.inventory.page()).toBe(1);
    expect(component.inventory.overrides()['facility:item-25']).toBe('detailed');
    expect(component.inventory.visibleTiles()).toHaveLength(24);

    cards.set(validCards.slice(0, 1)); fixture.detectChanges();
    expect(component.inventory.page()).toBe(0);
    expect(component.inventory.overrides()).toEqual({});
  });

  it('isolates session state by facility and persists a separate detail preference', () => {
    component.filtersForm.controls.search.setValue('Energy'); component.inventory.detailControl.setValue('detailed'); fixture.detectChanges();
    component.inventory.setTileDetail({ guid: 'facility:energy-a', level: 'simple' }); fixture.detectChanges();
    facility.set({ ...facility(), guid: 'facility-b', name: 'Facility B' }); route.set({ facilityGuid: 'facility-b' }); fixture.detectChanges();
    expect(component.filters().search).toBe(''); expect(component.inventory.overrides()).toEqual({});
    expect(component.inventory.detail()).toBe('detailed');
    facility.set({ ...facility(), guid: 'facility-a', name: 'Facility A' }); route.set({ facilityGuid: 'facility-a' }); fixture.detectChanges();
    expect(component.filters().search).toBe('Energy'); expect(component.inventory.overrides()['facility:energy-a']).toBe('simple');
    expect(storage.store.mock.calls.at(-1)?.[1]['["account-a","facilityAnalyses"]']).toBe('detailed');
    expect(storage.store.mock.calls.at(-1)?.[1]['["account-a","analyses"]']).toBeUndefined();
    singleSite.set(true); fixture.detectChanges(); expect(component.breadcrumbs()).toEqual([{ label: 'Facility A' }]);
  });

  it('hides single-category UI without applying an invisible category filter', () => {
    component.filtersForm.controls.category.setValue('water'); categories.set(['energy']); cards.set([cards()[0]]); fixture.detectChanges();
    expect(component.filteredEntries()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[formControlName="category"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.portfolio-tile__chip')).toBeNull();
    cards.update(items => [{ ...items[0], isActiveForReporting: true }]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Active for facility reporting');
    component.filtersForm.controls.status.setValue('active'); fixture.detectChanges(); expect(component.filteredEntries()).toHaveLength(1);
  });

  it.each(['energy', 'water'] as const)('creates %s analysis when an empty group makes the other category eligible', async category => {
    categories.set([category]);
    cards.set(cards().filter(card => card.category === category));
    fixture.detectChanges();

    buttonByText('Add Analysis').click(); fixture.detectChanges();
    const draft = fixture.debugElement.query(By.directive(AnalysisDraftSlideoutComponent));
    expect(draft.nativeElement.querySelector('select')).toBeNull();
    draft.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(actions.createAnalysis).toHaveBeenCalledExactlyOnceWith(category);
    expect(router.navigate).toHaveBeenCalledWith(['/analysis', 'facility-a', 'created-analysis']);
  });

  it('disables creation when the only displayed category has no eligible meter group', () => {
    actions.categoryAvailable.mockImplementation(category => category === 'energy');
    categories.set(['water']); cards.set([cards()[1]]); fixture.detectChanges();

    expect(buttonByText('Add Analysis').disabled).toBe(true);
    expect(actions.createAnalysis).not.toHaveBeenCalled();
  });

  it('keeps category selection available when the facility has both categories', async () => {
    buttonByText('Add Analysis').click(); fixture.detectChanges();
    const draft = fixture.debugElement.query(By.directive(AnalysisDraftSlideoutComponent));
    expect(draft.nativeElement.querySelector('select')).not.toBeNull();
    draft.componentInstance.category.setValue('water');
    draft.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(actions.createAnalysis).toHaveBeenCalledExactlyOnceWith('water');
  });

  it('keeps card demand when comparison closes and dismisses overlays on context changes', () => {
    component.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    component.openComparison(cards()[0]); fixture.detectChanges(); component.clearComparison(); fixture.detectChanges();
    expect(component.resultDemand()).toEqual(['energy-a', 'water-b']);
    component.openDetails(cards()[0]); fixture.detectChanges();
    facility.set({ ...facility(), guid: 'facility-b' }); route.set({ facilityGuid: 'facility-b' }); fixture.detectChanges();
    expect(component.detailsGuid()).toBeUndefined(); expect(component.comparisonGuids()).toEqual([]);
  });

  it('opens comparison in a portal, maintains column order, and clears selections on close', () => {
    const third = makeCard('energy-c', 'Energy C', 'ready'); cards.set([...cards(), third]);
    component.open(cards()[0]); component.openComparison(third); fixture.detectChanges();
    expect(modalPortal.show).toHaveBeenCalledWith(expect.any(TemplatePortal));
    expect(component.comparison.selection()).toEqual({ first: 'facility:energy-c', second: null });
    component.comparison.select({ first: 'facility:energy-c', second: 'facility:water-b' });
    expect(component.comparison.selection().second).toBeNull();
    component.comparison.select({ first: 'facility:energy-c', second: 'facility:energy-a' }); fixture.detectChanges();
    expect(component.comparisonCards().map(card => card.analysis.guid)).toEqual(['energy-c', 'energy-a']);
    expect(router.navigate).toHaveBeenCalledWith(['/analysis', 'facility-a', 'energy-a']);
    component.clearComparison(); expect(component.comparisonGuids()).toEqual([]);
  });
  it('keeps creation open with a visible command error, then closes and navigates after retry', async () => {
    actions.createAnalysis
      .mockRejectedValueOnce(new Error('Analysis creation failed.'))
      .mockResolvedValueOnce(makeCard('created-analysis', 'Created analysis', 'ready').analysis);

    buttonByText('Add Analysis').click();
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
    grid().actionRequested.emit({ guid: `facility:${cards()[0].analysis.guid}`, action: 'copy' });
    await fixture.whenStable();

    expect(actions.copyAnalysis).toHaveBeenCalledWith('energy-a');
    expect(router.navigate).toHaveBeenCalledWith(['/analysis', 'facility-a', 'copied-analysis']);
  });

  it('keeps active confirmation open after a command error, then closes after retry', async () => {
    actions.setActiveAnalysis
      .mockRejectedValueOnce(new Error('Active selection failed.'))
      .mockResolvedValueOnce(undefined);
    grid().actionRequested.emit({ guid: `facility:${cards()[0].analysis.guid}`, action: 'active' });
    fixture.detectChanges();

    expect(modalPortal.show.mock.calls[0][0]).toBeInstanceOf(TemplatePortal);
    await component.confirmActive();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.activeCandidate()?.analysis.guid).toBe(cards()[0].analysis.guid);
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

    grid().actionRequested.emit({ guid: `facility:${cards()[0].analysis.guid}`, action: 'delete' });
    fixture.detectChanges();

    void component.confirmDelete();
    expect(actions.deleteAnalysis).not.toHaveBeenCalled();
  });

  it('keeps deletion open after a command error, then closes after retry', async () => {
    actions.deleteAnalysis
      .mockRejectedValueOnce(new Error('Analysis deletion failed.'))
      .mockResolvedValueOnce(undefined);
    grid().actionRequested.emit({ guid: `facility:${cards()[0].analysis.guid}`, action: 'delete' });
    fixture.detectChanges();

    expect(modalPortal.show.mock.calls[0][0]).toBeInstanceOf(TemplatePortal);
    await component.confirmDelete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.deleteCandidate()?.analysis.guid).toBe(cards()[0].analysis.guid);
    expect(component.actionError()).toBe('Analysis deletion failed.');

    await component.confirmDelete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actions.deleteAnalysis).toHaveBeenCalledTimes(2);
    expect(component.deleteCandidate()).toBeUndefined();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  function grid(): InventoryGridComponent {
    return fixture.debugElement.query(By.directive(InventoryGridComponent)).componentInstance;
  }

  function buttonByText(label: string): HTMLButtonElement {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(item => item.textContent?.replace(/\s+/g, ' ').trim() === label);
    if (!button) throw new Error(`Button not found: ${label}`);
    return button;
  }

});

@Component({ selector: 'app-facility-analysis-comparison', template: '', standalone: true })
class FacilityAnalysisComparisonStubComponent {
  @Input() cards: unknown;
  @Input() facility: unknown;
  @Input() meterGroups: unknown;
  @Input() analyses: unknown;
  @Input() showCategory: unknown;
  @Output() closed = new EventEmitter<void>();
}

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
    findings: [],
    isActiveForReporting: false, linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
    modifiedDateLabel: 'Jan 2, 2025', modifiedSortValue: 2, searchText: `${name} ${category}`.toLocaleLowerCase(),
    attentionRank: status === 'warning' ? 1 : 3
  };
}

function readyOutcome(year: number, annual: number, month: Date, monthly: number) {
  return {
    state: 'ready' as const,
    reportYear: year,
    annualAnalysisSummaries: [{
      year,
      energyUse: 100,
      adjusted: 90,
      savings: 10,
      annualSavingsPercentImprovement: annual,
      totalSavingsPercentImprovement: annual,
      isBanked: false,
      isIntermediateBanked: false,
      savingsBanked: 0,
      missingPredictorValue: false
    }],
    summary: {
      annual: { periodLabel: String(year), value: annual },
      monthly: { periodLabel: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), value: monthly }
    }
  };
}
