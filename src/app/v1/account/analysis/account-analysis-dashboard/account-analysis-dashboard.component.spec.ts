import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisActionsService } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-actions.service';
import { AccountAnalysisActionsService } from './account-analysis-actions.service';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';
import { AccountAnalysisDashboardComponent } from './account-analysis-dashboard.component';
import { AccountAnalysisWorkspaceService } from './account-analysis-workspace.service';
import { AnalysisInventoryEntry } from '@app/v1/shared/analysis-inventory/analysis-inventory.models';
import { accountEntry, facilityEntry, inventoryAccount, inventoryFacility, inventoryOutcome } from './analysis-inventory.testing';

describe('Unified account Analysis dashboard', () => {
  let fixture: ComponentFixture<AccountAnalysisDashboardComponent>;
  let entries: ReturnType<typeof signal<readonly AnalysisInventoryEntry[]>>;
  let account: ReturnType<typeof signal<any>>;
  let state: ReturnType<typeof signal<string>>;
  let categories: ReturnType<typeof signal<readonly ('energy' | 'water')[]>>;
  let route: ReturnType<typeof signal<any>>;
  let results: { states: ReturnType<typeof signal<Record<string, any>>>; setDemand: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.fn>;
  let modal: { activePortal: ReturnType<typeof signal<any>>; show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let actions: any, facilityActions: any, storage: any;
  beforeEach(async () => {
    entries = signal([accountEntry(), accountEntry('water', 'water'), facilityEntry(), facilityEntry('alternate'), facilityEntry('other-plant', inventoryFacility('facility-b'))]);
    categories = signal<readonly ('energy' | 'water')[]>(['energy', 'water']);
    account = signal(inventoryAccount); state = signal('ready'); route = signal({ accountGuid: 'account-a' });
    results = { states: signal(Object.fromEntries(entries().map(entry => [entry.key, inventoryOutcome()]))), setDemand: vi.fn() };
    actions = { createAnalysis: vi.fn(), categoryAvailable: vi.fn(() => true), activeEligibility: vi.fn(() => ({ allowed: true })), copyAnalysis: vi.fn(), deleteAnalysis: vi.fn(), setActiveAnalysis: vi.fn() };
    facilityActions = { createAnalysis: vi.fn(), categoryAvailable: vi.fn(() => true), activeEligibility: vi.fn(() => ({ allowed: true })), copyAnalysis: vi.fn(), deleteAnalysis: vi.fn(), setActiveAnalysis: vi.fn() };
    modal = { activePortal: signal(null), show: vi.fn(portal => modal.activePortal.set(portal)), hide: vi.fn(() => modal.activePortal.set(null)) }; storage = { retrieve: () => null, store: vi.fn() };
    await TestBed.configureTestingModule({ imports: [AccountAnalysisDashboardComponent], providers: [
      provideRouter([]), { provide: LocalStorageService, useValue: storage },
      { provide: AccountAnalysisWorkspaceService, useValue: { account, entries, categories, facilities: signal([inventoryFacility(), inventoryFacility('facility-b')]), workspaceState: state, workspaceError: signal(undefined), statusState: signal('ready'), canWrite: signal(true), hasPending: signal(false), meterGroups: signal([]), statusItems: signal([]), facilityInputs: signal({ meterGroups: [], meters: [], meterData: [], predictorData: [] }), facilityAnalyses: signal(entries().flatMap(e => e.scope === 'facility' ? [e.card.analysis] : [])) } },
      { provide: AccountAnalysisActionsService, useValue: actions }, { provide: FacilityAnalysisActionsService, useValue: facilityActions },
      { provide: WorkspaceNavigationService, useValue: { routeState: route,
        accountAnalysisWorkbenchRoute: (_a: string, id: string) => ['/account-analysis', id], accountAnalysisRoute: () => ['/analyses'],
        facilityAnalysisWorkbenchRoute: (f: string, id: string) => ['/facility', f, 'analysis', id], facilityAnalysisRoute: (f: string) => ['/facility', f, 'analysis'] } },
      { provide: ModalPortalService, useValue: modal }
    ] }).overrideComponent(AccountAnalysisDashboardComponent, { set: { providers: [{ provide: AccountAnalysisDashboardResultsService, useValue: results }] } }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AccountAnalysisDashboardComponent); fixture.detectChanges();
  });

  it('defaults to simple mixed cards with explicit ownership/reporting and no duplicate active strip', () => {
    const root = fixture.nativeElement;
    expect(root.querySelectorAll('.portfolio-inventory .portfolio-tile')).toHaveLength(5);
    expect(root.textContent).toContain('Account analysis'); expect(root.textContent).toContain('Facility analysis');
    expect(root.textContent).toContain('Active for account reporting'); expect(root.textContent).toContain('Active for facility reporting');
    expect(root.querySelector('app-active-summary-card')).toBeNull();
    expect(root.querySelector('[data-analysis-scope="account"] .portfolio-tile__owner')).toBeNull();
    expect(root.querySelector('[data-analysis-scope="facility"] .portfolio-tile__analysis-scope .portfolio-tile__owner')).toBeNull();
    expect(root.querySelector('[data-analysis-scope="facility"] .portfolio-tile__ownership .portfolio-tile__owner')?.textContent).toContain('Plant');
    for (const tile of root.querySelectorAll('.portfolio-inventory .portfolio-tile')) {
      expect(tile.querySelectorAll('.portfolio-tile__analysis-scope app-ui-icon')).toHaveLength(1);
      expect(tile.querySelectorAll('.portfolio-tile__heading > app-ui-icon')).toHaveLength(1);
      expect(tile.querySelector('.portfolio-tile__owner app-ui-icon')).toBeNull();
    }
    expect(root.querySelector('.portfolio-tile__analysis-modified')).toBeNull(); expect(root.textContent).not.toContain('12.5%'); expect(fixture.componentInstance.resultDemand()).toEqual([]);
  });
  it('loads only expanded cards and clears overrides when the global level changes', () => {
    const host = fixture.componentInstance;
    host.inventory.setTileDetail({ guid: 'facility:alternate', level: 'detailed' }); fixture.detectChanges();
    expect(host.resultDemand().map(e => e.key)).toEqual(['facility:alternate']);
    expect(fixture.nativeElement.textContent).toContain('12.5%');
    host.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(host.inventory.overrides()).toEqual({}); expect(host.resultDemand()).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile__analysis-modified')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('.portfolio-tile__context .portfolio-tile__analysis-modified')?.textContent).toContain('Updated');
  });
  it('defaults to account-first ordering before pagination and restores a chosen alternative sort', () => {
    const host = fixture.componentInstance;
    expect(host.filters().sort).toBe('account-first');
    expect((fixture.nativeElement.querySelector('[formControlName="sort"]') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Account analyses first');
    entries.set([...Array.from({ length: 25 }, (_, index) => facilityEntry(`A-${index}`)), accountEntry('Z-account')]); fixture.detectChanges();
    expect(host.inventory.visibleIds()[0]).toBe('account:Z-account');
    host.filtersForm.controls.sort.setValue('name'); fixture.detectChanges();
    expect(host.inventory.visibleIds()[0]).toBe('facility:A-0');
    fixture.destroy(); fixture = TestBed.createComponent(AccountAnalysisDashboardComponent); fixture.detectChanges();
    expect(fixture.componentInstance.filters().sort).toBe('name');
    fixture.componentInstance.clearFilters(); fixture.detectChanges();
    expect(fixture.componentInstance.filters().sort).toBe('account-first');
    expect(fixture.componentInstance.inventory.visibleIds()[0]).toBe('account:Z-account');
  });
  it('shows category text with matching icons at every detail level when both categories apply', () => {
    for (const level of ['simple', 'summary', 'detailed'] as const) {
      fixture.componentInstance.inventory.detailControl.setValue(level); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[formControlName="category"]')).not.toBeNull();
      const chips = fixture.debugElement.queryAll(By.css('.portfolio-inventory .portfolio-tile__chip'));
      expect(chips).toHaveLength(5);
      expect(chips.map(chip => chip.query(By.css('app-ui-icon')).componentInstance.name).sort()).toEqual(['droplet', 'energy', 'energy', 'energy', 'energy']);
      expect(chips.filter(chip => chip.nativeElement.textContent.trim() === 'Water')).toHaveLength(1);
    }
  });
  for (const category of ['energy', 'water'] as const) {
    it(`hides redundant categories for ${category}-only accounts and ignores a remembered opposite-category filter`, () => {
      const host = fixture.componentInstance;
      host.filtersForm.controls.category.setValue(category === 'energy' ? 'water' : 'energy');
      entries.set([accountEntry('single', category)]); categories.set([category]); fixture.detectChanges();
      expect(host.filteredEntries()).toHaveLength(1);
      expect(fixture.nativeElement.querySelector('[formControlName="category"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('.portfolio-tile__chip')).toBeNull();
      host.detailsGuid.set('account:single'); fixture.detectChanges();
      expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('dt')).map(node => node.textContent)).not.toContain('Category');
      expect(fixture.nativeElement.textContent).toContain('Basis and units');
      host.detailsGuid.set(undefined); host.openCreate(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-account-analysis-draft-slideout [formControlName="category"]')).toBeNull();
      // Adding the second category restores the remembered selection and visible control.
      categories.set(['energy', 'water']); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[formControlName="category"]')).not.toBeNull();
      expect(host.filters().category).toBe(category === 'energy' ? 'water' : 'energy');
    });
  }
  it('hides category rows in facility details and both comparison slideouts for a single-category account', () => {
    const host = fixture.componentInstance;
    categories.set(['energy']); entries.update(items => items.filter(entry => entry.card.category === 'energy'));
    host.detailsGuid.set('facility:alternate'); fixture.detectChanges();
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('dt')).map(node => node.textContent)).not.toContain('Category');
    host.detailsGuid.set(undefined);
    host.openComparison(entries()[1]); host.comparison.select({ first: entries()[1].key, second: entries()[2].key }); fixture.detectChanges();
    expect(host.facilityComparison()?.cards).toHaveLength(2);
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('th')).map(node => node.textContent?.trim())).not.toContain('Category');
    host.clearComparison(); entries.update(items => [...items, accountEntry('second')]);
    host.openComparison(entries()[0]); host.comparison.select({ first: entries()[0].key, second: entries()[4].key }); fixture.detectChanges();
    expect(host.accountComparisonCards()).toHaveLength(2);
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('th')).map(node => node.textContent?.trim())).not.toContain('Category');
  });
  it('searches owner names and filters both levels before pagination', () => {
    const host = fixture.componentInstance;
    host.filtersForm.patchValue({ search: 'Cedar', scope: 'facility' }); fixture.detectChanges();
    expect(host.filteredEntries().map(e => e.key)).toEqual(['facility:other-plant']);
    host.filtersForm.patchValue({ category: 'water' }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No analyses match');
    host.clearFilters(); fixture.detectChanges(); expect(host.filteredEntries()).toHaveLength(5);
  });
  it('pages 24 records, bounds result demand, preserves page on detail changes, and clamps deletions', () => {
    entries.set(Array.from({ length: 55 }, (_, i) => accountEntry(`item-${String(i).padStart(2, '0')}`))); fixture.detectChanges();
    const host = fixture.componentInstance; host.inventory.selectPage(2); host.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(host.inventory.page()).toBe(2); expect(host.resultDemand()).toHaveLength(7);
    entries.update(all => all.slice(0, 25)); fixture.detectChanges(); expect(host.inventory.page()).toBe(1);
  });
  it('opens the owning workbench and owning facility route without selecting a facility', async () => {
    fixture.componentInstance.open(entries()[2]); expect(navigate).toHaveBeenCalledWith(['/facility', 'facility-a', 'analysis', 'facility-a-energy']);
    const link = fixture.nativeElement.querySelector('.portfolio-tile__owner[href="/facility/facility-a/analysis"]') as HTMLAnchorElement;
    link.click(); expect(navigate).toHaveBeenCalledWith(['/facility', 'facility-a', 'analysis']);
  });
  it('opens comparison from a card, preserves slot order, and rejects incompatible pairs', () => {
    const host = fixture.componentInstance;
    host.openComparison(entries()[3]);
    expect(modal.show).toHaveBeenCalledOnce();
    expect(host.comparison.selection()).toEqual({ first: 'facility:alternate', second: null });
    host.comparison.select({ first: 'facility:alternate', second: 'account:account-energy' });
    expect(host.comparison.selection().second).toBeNull();
    host.comparison.select({ first: 'facility:alternate', second: 'facility:other-plant' });
    expect(host.comparison.selection().second).toBeNull();
    host.comparison.select({ first: 'facility:alternate', second: 'facility:facility-a-energy' }); fixture.detectChanges();
    expect(host.facilityComparison()?.cards.map(card => card.analysis.guid)).toEqual(['alternate', 'facility-a-energy']);
    host.clearComparison(); fixture.detectChanges();
    expect(host.comparisonGuids()).toEqual([]); expect(host.resultDemand()).toEqual([]);
    host.openComparison(); expect(host.comparison.selection()).toEqual({ first: null, second: null });
  });
  it('dispatches facility copy/activate/delete using the explicit owner and a portal confirmation', async () => {
    const host = fixture.componentInstance, entry = entries()[3];
    facilityActions.copyAnalysis.mockResolvedValue({ accountId: 'account-a', guid: 'copy' });
    await host.copy(entry); expect(facilityActions.copyAnalysis).toHaveBeenCalledWith('alternate', 'facility-a');
    host.requestActive(entry); expect(modal.show).toHaveBeenCalledOnce(); await host.confirmActive();
    expect(facilityActions.setActiveAnalysis).toHaveBeenCalledWith('alternate', 'facility-a');
    host.requestDelete(entry); await host.confirmDelete();
    expect(facilityActions.deleteAnalysis).toHaveBeenCalledWith('alternate', 'facility-a'); expect(actions.deleteAnalysis).not.toHaveBeenCalled();
  });
  it('offers Add Analysis without an existing account category and creates either type in its owning workbench', async () => {
    const host = fixture.componentInstance;
    actions.categoryAvailable.mockReturnValue(false);
    const add = fixture.nativeElement.querySelector('.analysis-inventory__header > button') as HTMLButtonElement;
    expect(add.textContent?.trim()).toBe('Add Analysis'); expect(add.disabled).toBe(false);
    add.click(); fixture.detectChanges(); expect(host.createOpen()).toBe(true);
    facilityActions.createAnalysis.mockResolvedValue({ accountId: 'account-a', facilityId: 'facility-b', guid: 'new-facility' });
    await host.create({ scope: 'facility', category: 'energy', facilityGuid: 'facility-b' });
    expect(facilityActions.createAnalysis).toHaveBeenCalledWith('energy', 'facility-b');
    expect(navigate).toHaveBeenLastCalledWith(['/facility', 'facility-b', 'analysis', 'new-facility']);
    expect(actions.createAnalysis).not.toHaveBeenCalled(); expect(host.createOpen()).toBe(false);
    actions.createAnalysis.mockResolvedValue({ accountId: 'account-a', guid: 'new-account' });
    host.openCreate(); await host.create({ scope: 'account', category: 'water' });
    expect(actions.createAnalysis).toHaveBeenCalledWith('water');
    expect(navigate).toHaveBeenLastCalledWith(['/account-analysis', 'new-account']);
  });
  it('keeps creation errors in the slideout and suppresses navigation after an account switch', async () => {
    const host = fixture.componentInstance; host.openCreate();
    facilityActions.createAnalysis.mockRejectedValue(new Error('The facility was removed'));
    await host.create({ scope: 'facility', category: 'energy', facilityGuid: 'facility-b' }); fixture.detectChanges();
    expect(host.createOpen()).toBe(true); expect(fixture.nativeElement.textContent).toContain('The facility was removed');
    expect(host.saving()).toBe(false); expect(navigate).not.toHaveBeenCalled();
    let complete!: (value: any) => void;
    facilityActions.createAnalysis.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const pending = host.create({ scope: 'facility', category: 'energy', facilityGuid: 'facility-b' });
    await host.create({ scope: 'facility', category: 'energy', facilityGuid: 'facility-b' });
    expect(facilityActions.createAnalysis).toHaveBeenCalledTimes(2);
    state.set('switching'); fixture.detectChanges();
    route.set({ accountGuid: 'account-b' }); account.set({ ...inventoryAccount, guid: 'account-b' }); state.set('ready'); fixture.detectChanges();
    complete({ accountId: 'account-a', facilityId: 'facility-b', guid: 'new' }); await pending;
    expect(navigate).not.toHaveBeenCalled(); expect(host.actionError()).toBeUndefined();
  });
  it('preserves nonzero, blocked, and failed result labels rather than replacing them with zero', () => {
    results.states.set({ 'account:account-energy': { state: 'blocked', message: 'Setup incomplete' }, 'facility:alternate': { state: 'error', message: 'Calculation failed' } });
    fixture.componentInstance.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Setup incomplete'); expect(fixture.nativeElement.textContent).toContain('Calculation failed');
    expect(fixture.nativeElement.textContent).not.toContain('0%');
  });
  it('hides retained content during an account switch and restores account-scoped filters on return', () => {
    const host = fixture.componentInstance;
    host.filtersForm.controls.search.setValue('alternate'); fixture.detectChanges(); host.requestActive(entries()[3]);
    state.set('switching'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-inventory-grid')).toBeNull(); expect(host.activeCandidate()).toBeUndefined(); expect(modal.hide).toHaveBeenCalled();
    route.set({ accountGuid: 'account-b' }); account.set({ ...inventoryAccount, guid: 'account-b' }); state.set('ready'); fixture.detectChanges();
    expect(host.filters().search).toBe('');
    route.set({ accountGuid: 'account-a' }); account.set(inventoryAccount); fixture.detectChanges();
    expect(host.filters().search).toBe('alternate');
  });
  it('restores filters, page and overrides after leaving and returning, but persists only global detail', () => {
    const host = fixture.componentInstance; host.filtersForm.controls.scope.setValue('facility'); fixture.detectChanges();
    host.inventory.detailControl.setValue('summary'); host.inventory.setTileDetail({ guid: 'facility:alternate', level: 'detailed' }); fixture.detectChanges();
    fixture.destroy(); fixture = TestBed.createComponent(AccountAnalysisDashboardComponent); fixture.detectChanges();
    expect(fixture.componentInstance.filters().scope).toBe('facility'); expect(fixture.componentInstance.inventory.overrides()['facility:alternate']).toBe('detailed');
    expect(storage.store).toHaveBeenCalledOnce(); expect(JSON.stringify(storage.store.mock.calls)).not.toContain('alternate');
  });
});
