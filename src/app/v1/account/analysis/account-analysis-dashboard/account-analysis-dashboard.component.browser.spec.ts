import { WorkspaceBottomSheetComponent } from '@app/v1/shared/workspace-bottom-sheet/workspace-bottom-sheet.component';
import { PortalModule } from '@angular/cdk/portal';
import { FacilityAnalysisDashboardComponent } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-dashboard.component';
import { FacilityAnalysisWorkspaceService } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-workspace.service';
import { FacilityAnalysisDashboardResultsService } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-dashboard-results.service';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterLink, RouterOutlet, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { cdp, page, userEvent } from 'vitest/browser';
import { LocalStorageService } from 'ngx-webstorage';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { NavigationMotionDirective } from '@app/v1/shared/navigation/navigation-motion/navigation-motion.directive';
import { FacilityAnalysisActionsService } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-actions.service';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/account/data/portfolio/portfolio-browser-test.helpers';
import { AccountAnalysisDashboardComponent } from './account-analysis-dashboard.component';
import { AccountAnalysisWorkspaceService } from './account-analysis-workspace.service';
import { AccountAnalysisActionsService } from './account-analysis-actions.service';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';
import { accountEntry, facilityEntry, inventoryAccount, inventoryFacility, inventoryOutcome } from './analysis-inventory.testing';

const dashboardUrl = '/v1/workspace/account/account-a/analysis/dashboard';
@Component({ standalone: true, imports: [RouterOutlet, NavigationMotionDirective, PortalModule], template: '<main class="v1-root" style="height:600px;min-height:0;overflow:auto;width:100%"><div [appNavigationMotion]="navigation.routeMotion()" [navigationMotionKey]="navigation.routeMotionKey()"><router-outlet/></div><ng-template [cdkPortalOutlet]="portal.activePortal()"/></main>' })
class AnalysisBrowserHost { readonly portal = inject(ModalPortalService); readonly navigation = inject(WorkspaceNavigationService); }
@Component({ standalone: true, imports: [RouterLink], template: '<h1>Facility analysis workbench</h1>@if (navigation.accountReturn(); as back) { <a [routerLink]="back.route">Account Analysis</a> } @if (navigation.facility(); as facility) { <a [routerLink]="navigation.facilityAnalysisRoute(facility.guid)">Facility Analysis</a> }' })
class FacilityDestination { readonly navigation = inject(WorkspaceNavigationService); }

function setup(count = 35) {
  const entries = signal([accountEntry(), accountEntry('water', 'water'), ...Array.from({ length: count }, (_, i) => facilityEntry(`Analysis ${String(i).padStart(2,'0')}`))]);
  const account = signal(inventoryAccount), facilities = signal([inventoryFacility(), inventoryFacility('facility-b')]);
  const selectedFacility = signal(facilities()[0]);
  const facilityActions = { categoryAvailable: (category: string, guid: string) => guid === 'facility-b' ? category === 'water' : category === 'energy', createAnalysis: vi.fn() };
  const status = signal('ready');
  const categories = signal<readonly ('energy' | 'water')[]>(['energy', 'water']);
  const results = { states: signal(Object.fromEntries(entries().map(entry => [entry.key, inventoryOutcome()]))), setDemand: vi.fn() };
  const canEnter = signal(true), canLeave = signal(true);
  TestBed.configureTestingModule({ imports: [AnalysisBrowserHost], providers: [provideRouter([
    { path: 'v1/workspace/account/:accountGuid/analysis/dashboard', component: AccountAnalysisDashboardComponent },
    { path: 'v1/workspace/facility/:facilityGuid/analysis/workbench/:analysisGuid/setup', component: FacilityDestination, canActivate: [() => canEnter()], canDeactivate: [() => canLeave()] },
    { path: 'v1/workspace/facility/:facilityGuid/analysis/dashboard', component: FacilityAnalysisDashboardComponent }
  ]),
    { provide: AccountWorkspaceStore, useValue: { account, facilities, selectedFacility } },
    { provide: AccountWorkspaceService, useValue: {} }, { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [inventoryAccount] } },
    { provide: WorkspaceStatusService, useValue: { state: status, items: signal([]) } },
    { provide: AccountAnalysisWorkspaceService, useValue: { account, entries, categories, facilities, workspaceState: status, workspaceError: signal(undefined), statusState: status, canWrite: signal(true), hasPending: signal(false), meterGroups: signal([]), facilityAnalyses: signal([]) } },
    { provide: FacilityAnalysisWorkspaceService, useValue: { account, facility: selectedFacility, categories,
      cards: computed(() => entries().flatMap(entry => entry.scope === 'facility' && entry.facility.guid === selectedFacility().guid ? [entry.card] : [])),
      analyses: computed(() => entries().flatMap(entry => entry.scope === 'facility' && entry.facility.guid === selectedFacility().guid ? [entry.card.analysis] : [])),
      workspaceState: status, workspaceError: signal(undefined), statusState: status, canWrite: signal(true), hasPending: signal(false), meterGroups: signal([]) } },
    { provide: AccountAnalysisActionsService, useValue: { categoryAvailable: () => true } },
    { provide: FacilityAnalysisActionsService, useValue: facilityActions },
    { provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } }
  ] }).overrideComponent(AccountAnalysisDashboardComponent, { set: { providers: [{ provide: AccountAnalysisDashboardResultsService, useValue: results }] } });
  TestBed.overrideComponent(FacilityAnalysisDashboardComponent, { set: { providers: [{ provide: FacilityAnalysisDashboardResultsService, useValue: { setDemand: vi.fn(), states: computed(() => Object.fromEntries(entries().filter(entry => entry.scope === 'facility').map(entry => [entry.card.analysis.guid, inventoryOutcome()]))) } }] } });
  const fixture = TestBed.createComponent(AnalysisBrowserHost); fixture.detectChanges();
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const host = () => fixture.debugElement.query(By.directive(AccountAnalysisDashboardComponent)).componentInstance as AccountAnalysisDashboardComponent;
  return { fixture, entries, categories, results, router, host, canEnter, canLeave, selectedFacility, facilityActions, root: fixture.nativeElement.querySelector('main') as HTMLElement };
}
async function settle(fixture: ReturnType<typeof setup>['fixture']): Promise<void> {
  fixture.detectChanges(); await fixture.whenStable();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  fixture.detectChanges();
}

describe('account Analysis inventory browser journeys', () => {
  afterEach(async () => { await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); });
  it('opens Compare from a card menu, focuses the second slot, preserves pair order, and clears on close', async () => {
    await page.viewport(1200, 900);
    const view = setup(4); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    view.host().filtersForm.controls.scope.setValue('facility'); await settle(view.fixture);
    const menu = view.root.querySelector<HTMLButtonElement>('.portfolio-tile__menu-button')!;
    const key = menu.dataset['browseId']!;
    menu.focus(); await userEvent.keyboard('{Enter}'); await settle(view.fixture);
    await page.getByRole('menuitem', { name: 'Compare', exact: true }).click(); await settle(view.fixture);
    expect(document.querySelector('[role="menu"]')).toBeNull();
    const dialog = document.querySelector<HTMLElement>('#analysis-comparison-sheet')!;
    expect(dialog).not.toBeNull();
    expect(getComputedStyle(dialog).animationDuration).toBe('0.38s');
    const first = dialog.querySelector<HTMLSelectElement>('[formControlName="first"]')!;
    const second = dialog.querySelector<HTMLSelectElement>('[formControlName="second"]')!;
    expect(first.value).toBe(key); expect(document.activeElement).toBe(second);
    expect(Array.from(first.options).some(option => option.value === 'account:account-energy')).toBe(true);
    const compatible = view.entries().find(entry => entry.scope === 'facility' && entry.key !== key)!.key;
    await page.getByRole('combobox', { name: 'Analysis 2', exact: true }).selectOptions(compatible); await settle(view.fixture);
    expect(view.host().comparisonGuids()).toEqual([key, compatible]);
    expect(dialog.textContent).toContain('Analysis setup'); expect(view.host().resultDemand().map(entry => entry.key)).toEqual(expect.arrayContaining([key, compatible]));
    await userEvent.keyboard('{Escape}'); await settle(view.fixture);
    await vi.waitFor(() => expect(document.querySelector('#analysis-comparison-sheet')).toBeNull());
    expect(view.host().comparisonGuids()).toEqual([]); expect(view.host().resultDemand()).toEqual([]); expect(document.activeElement).toBe(menu);
    view.entries.update(entries => [...entries, accountEntry('Another account analysis')]); await settle(view.fixture);
    await page.getByRole('button', { name: 'Compare', exact: true }).click(); await settle(view.fixture);
    expect(view.host().comparison.selection()).toEqual({ first: null, second: null });
    expect(document.activeElement?.getAttribute('formControlName')).toBe('first');
    await page.getByRole('combobox', { name: 'Analysis 1', exact: true }).selectOptions('account:Another account analysis'); await settle(view.fixture);
    await page.getByRole('combobox', { name: 'Analysis 2', exact: true }).selectOptions('account:account-energy'); await settle(view.fixture);
    expect(view.host().accountComparisonCards().map(card => card.analysis.guid)).toEqual(['Another account analysis', 'account-energy']);
    expect(document.querySelector('#analysis-comparison-sheet')?.textContent).toContain('Facility analysis selections');
    for (const classes of ['v1-root', 'v1-root v1-theme-dark', 'v1-root v1-theme-dark v1-contrast-strong']) {
      view.root.className = classes; await settle(view.fixture);
      const surface = document.querySelector<HTMLElement>('#analysis-comparison-sheet')!;
      expect(getComputedStyle(document.querySelector('.analysis-comparison-selectors label')!).color).toBe(getComputedStyle(surface).color);
      expect(textContrast(surface)).toBeGreaterThanOrEqual(4.5);
    }
    await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print', features: [] }); await settle(view.fixture);
    expect(getComputedStyle(document.querySelector('.workspace-bottom-sheet-layer')!).display).toBe('none');
    await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [] }); await settle(view.fixture);
    await page.getByRole('combobox', { name: 'Analysis 1', exact: true }).selectOptions(key); await settle(view.fixture);
    expect(view.host().comparison.selection().second).toBeNull();
    expect(document.querySelector('#analysis-comparison-sheet')?.textContent).toContain('was cleared');
    const sheet = view.fixture.debugElement.query(By.directive(WorkspaceBottomSheetComponent)).componentInstance as WorkspaceBottomSheetComponent;
    sheet.requestClose(); view.host().openComparison(); // A duplicate open during the closing animation must not create an orphan portal.
    await settle(view.fixture);
    await vi.waitFor(() => expect(view.host().comparison.opened()).toBe(false));
    expect(document.querySelector('#analysis-comparison-sheet')).toBeNull();
    view.fixture.destroy();
  });
  it('supports the facility action menu, narrow layouts, reduced motion, deleted selections, and backdrop dismissal', async () => {
    await page.viewport(390, 800);
    await (cdp() as any).send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const view = setup(3); await view.router.navigateByUrl('/v1/workspace/facility/facility-a/analysis/dashboard'); await settle(view.fixture);
    const host = view.fixture.debugElement.query(By.directive(FacilityAnalysisDashboardComponent)).componentInstance as FacilityAnalysisDashboardComponent;
    const menu = view.root.querySelector<HTMLButtonElement>('button[aria-label^="Options for"]')!;
    await page.elementLocator(menu).click(); await settle(view.fixture);
    await page.getByRole('menuitem', { name: 'Compare', exact: true }).click(); await settle(view.fixture);
    let dialog = document.querySelector<HTMLElement>('#analysis-comparison-sheet')!;
    expect(getComputedStyle(dialog).animationName).toBe('none'); expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth + 1);
    const seeded = host.comparison.selection().first!;
    const second = host.comparison.secondOptions()[0].key;
    await page.getByRole('combobox', { name: 'Analysis 2', exact: true }).selectOptions(second); await settle(view.fixture);
    expect(host.comparisonCards()).toHaveLength(2); expect(dialog.textContent).toContain('Group modeling setup');
    view.entries.update(entries => entries.filter(entry => entry.key !== seeded)); await settle(view.fixture);
    expect(host.comparison.selection()).toEqual({ first: null, second }); expect(dialog.textContent).toContain('no longer available');
    await page.getByRole('button', { name: 'Dismiss comparison', exact: true }).click({ position: { x: 2, y: 2 } }); await settle(view.fixture);
    expect(host.comparison.opened()).toBe(false); expect(host.comparisonGuids()).toEqual([]);
    expect(document.activeElement?.getAttribute('aria-controls')).toBe('analysis-comparison-sheet');
    await page.getByRole('button', { name: 'Compare', exact: true }).click(); await settle(view.fixture);
    expect(host.comparison.selection()).toEqual({ first: null, second: null });
    await page.getByRole('button', { name: 'Close comparison', exact: true }).click(); await settle(view.fixture);
    expect(document.activeElement?.textContent).toContain('Compare'); view.fixture.destroy();
  });
  it('creates a facility analysis from the account slideout with explicit ownership and a category-safe default', async () => {
    await page.viewport(390, 800);
    const view = setup(2); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    await page.getByRole('button', { name: 'Add Analysis', exact: true }).click(); await settle(view.fixture);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Type', exact: true }).selectOptions('facility'); await settle(view.fixture);
    const submit = view.root.querySelector<HTMLButtonElement>('app-account-analysis-draft-slideout button[type="submit"]')!;
    expect(submit.disabled).toBe(true);
    await dialog.getByRole('combobox', { name: 'Facility', exact: true }).selectOptions('facility-b'); await settle(view.fixture);
    expect((view.root.querySelector('app-account-analysis-draft-slideout [formControlName="category"]') as HTMLSelectElement).value).toBe('water');
    expect(view.selectedFacility().guid).toBe('facility-a'); expect(submit.disabled).toBe(false);
    const panel = view.root.querySelector<HTMLElement>('.v1-workspace-slideout')!;
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
    view.facilityActions.createAnalysis.mockResolvedValue({ accountId: 'account-a', facilityId: 'facility-b', guid: 'new-facility-analysis' });
    await dialog.getByRole('button', { name: 'Add Analysis', exact: true }).click(); await settle(view.fixture);
    expect(view.facilityActions.createAnalysis).toHaveBeenCalledWith('water', 'facility-b');
    expect(view.router.url).toBe('/v1/workspace/facility/facility-b/analysis/workbench/new-facility-analysis/setup');
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-in');
    view.fixture.destroy();
  });
  it('drills into the owning workbench and restores filters, page, detail, scroll and focus on breadcrumb return and browser Back', async () => {
    await page.viewport(1200, 900);
    const view = setup(); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    view.host().filtersForm.controls.scope.setValue('facility'); await settle(view.fixture);
    view.host().inventory.selectPage(1); await settle(view.fixture);
    const id = view.host().inventory.visibleIds()[0];
    view.host().inventory.setTileDetail({ guid: id, level: 'detailed' }); await settle(view.fixture);
    const anchor = view.root.querySelector<HTMLAnchorElement>(`a.portfolio-tile__name[data-browse-id="${id}"]`)!;
    anchor.focus(); view.root.scrollTop = 300; const scroll = view.root.scrollTop;
    anchor.click(); await settle(view.fixture);
    expect(view.router.url).toContain('/facility/facility-a/analysis/workbench/');
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-in');
    const movingPage = view.root.querySelector('router-outlet + *')!;
    const animation = movingPage.getAnimations()[0];
    expect(animation.effect!.getTiming().duration).toBe(480);
    expect(view.root.getAnimations()).toHaveLength(0);
    const back = view.root.querySelector<HTMLAnchorElement>('a')!;
    view.canLeave.set(false); back.click(); await settle(view.fixture);
    expect(view.router.url).toContain('/facility/facility-a/analysis/workbench/');
    view.canLeave.set(true); back.click(); await settle(view.fixture);
    await vi.waitFor(() => {
      expect(view.host().filters().scope).toBe('facility'); expect(view.host().inventory.page()).toBe(1);
      expect(view.host().inventory.overrides()[id]).toBe('detailed'); expect(view.root.scrollTop).toBeCloseTo(scroll, 0);
      expect((document.activeElement as HTMLElement).dataset['browseId']).toBe(id);
    });
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-out');
    view.root.querySelector<HTMLAnchorElement>(`a.portfolio-tile__name[data-browse-id="${id}"]`)!.click(); await settle(view.fixture);
    TestBed.inject(Location).back(); await settle(view.fixture);
    await vi.waitFor(() => expect(view.router.url).toBe(dashboardUrl)); await settle(view.fixture);
    expect(view.host().inventory.page()).toBe(1);
  });
  it('keeps a canceled drill-in on the dashboard and falls back to its heading after deletion while away', async () => {
    await page.viewport(1200, 900);
    const view = setup(); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    const id = 'facility:Analysis 00';
    view.canEnter.set(false);
    const link = () => view.root.querySelector<HTMLAnchorElement>(`a.portfolio-tile__name[data-browse-id="${id}"]`)!;
    link().focus(); link().click(); await settle(view.fixture); expect(view.router.url).toBe(dashboardUrl);
    view.canEnter.set(true); link().click(); await settle(view.fixture);
    view.entries.update(entries => entries.filter(entry => entry.key !== id));
    view.root.querySelector<HTMLAnchorElement>('a')!.click(); await settle(view.fixture);
    await vi.waitFor(() => expect((document.activeElement as HTMLElement).id).toBe('v1-account-analysis-title'));
    view.fixture.destroy();
  });
  it('returns to the originating card after asynchronous results settle and the CSS grid renders', async () => {
    await page.viewport(1200, 900);
    const view = setup(); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    view.host().filtersForm.controls.scope.setValue('facility');
    view.host().inventory.detailControl.setValue('summary'); await settle(view.fixture);
    view.host().inventory.selectPage(1); await settle(view.fixture);
    const id = view.host().inventory.visibleIds().at(-1)!;
    const link = view.root.querySelector<HTMLAnchorElement>(`a.portfolio-tile__name[data-browse-id="${id}"]`)!;
    link.focus(); view.root.scrollTop = view.root.scrollHeight;
    link.click(); await settle(view.fixture);
    const ready = view.results.states();
    view.results.states.set(Object.fromEntries(Object.keys(ready).map(key => [key, { state: 'loading', message: 'Calculating…' }])));
    view.root.querySelector<HTMLAnchorElement>('a')!.click(); await settle(view.fixture);
    expect(view.host().browseReady()).toBe(false);
    view.results.states.set(ready); await settle(view.fixture);
    await vi.waitFor(() => {
      expect(view.host().browseReady()).toBe(true);
      expect(view.host().inventory.page()).toBe(1);
      expect((document.activeElement as HTMLElement).dataset['browseId']).toBe(id);
      // Header collapse can change the maximum scroll offset; the originating card must remain in view.
      const restoredLink = view.root.querySelector<HTMLAnchorElement>(`a.portfolio-tile__name[data-browse-id="${id}"]`)!;
      const bounds = restoredLink.getBoundingClientRect();
      const toolbar = view.root.querySelector<HTMLElement>('.analysis-inventory__toolbar')!.getBoundingClientRect();
      expect(bounds.top).toBeGreaterThanOrEqual(toolbar.bottom);
      expect(bounds.bottom).toBeLessThanOrEqual(view.root.getBoundingClientRect().bottom);
    });
    view.fixture.destroy();
  });

  it('restores facility dashboard controls, originating-card visibility and focus on breadcrumb return and Back', async () => {
    await page.viewport(1200, 900);
    const view = setup(); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    view.root.querySelector<HTMLAnchorElement>('.portfolio-tile__owner')!.click(); await settle(view.fixture);
    const dashboard = () => view.fixture.debugElement.query(By.directive(FacilityAnalysisDashboardComponent)).componentInstance as FacilityAnalysisDashboardComponent;
    const facilityUrl = view.router.url;
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-in');
    expect(view.root.querySelector('h1')?.textContent).toContain('Analysis');
    expect(view.root.querySelector('.portfolio-tile__owner')).toBeNull();
    dashboard().filtersForm.controls.search.setValue('Analysis'); await settle(view.fixture);
    dashboard().inventory.selectPage(1); dashboard().inventory.detailControl.setValue('summary'); await settle(view.fixture);
    const id = dashboard().inventory.visibleIds().at(-1)!;
    dashboard().inventory.setTileDetail({ guid: id, level: 'detailed' }); await settle(view.fixture);
    const origin = () => view.root.querySelector<HTMLAnchorElement>(`a.portfolio-tile__name[data-browse-id="${id}"]`)!;
    origin().focus(); origin().scrollIntoView({ block: 'center' });
    origin().click(); await settle(view.fixture);
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-in');
    view.root.querySelectorAll<HTMLAnchorElement>('a')[1].click(); await settle(view.fixture);
    await vi.waitFor(() => {
      expect(view.router.url).toBe(facilityUrl);
      expect(dashboard().filters().search).toBe('Analysis'); expect(dashboard().inventory.page()).toBe(1);
      expect(dashboard().inventory.overrides()[id]).toBe('detailed');
      expect((document.activeElement as HTMLElement).dataset['browseId']).toBe(id);
      const bounds = origin().getBoundingClientRect();
      expect(bounds.top).toBeGreaterThanOrEqual(view.root.querySelector('.analysis-inventory__toolbar')!.getBoundingClientRect().bottom);
      expect(bounds.bottom).toBeLessThanOrEqual(view.root.getBoundingClientRect().bottom);
    });
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-out');
    origin().click(); await settle(view.fixture); TestBed.inject(Location).back(); await settle(view.fixture);
    await vi.waitFor(() => expect(view.router.url).toBe(facilityUrl)); await settle(view.fixture);
    expect(dashboard().inventory.page()).toBe(1);
    view.root.querySelector<HTMLAnchorElement>('app-page-identity nav a')!.click(); await settle(view.fixture);
    expect(view.router.url).toBe(dashboardUrl);
    view.fixture.destroy();
  });

  it('keeps canceled facility navigation in place and falls back to the dashboard heading after an origin is deleted', async () => {
    await page.viewport(1200, 900);
    const view = setup(3); await view.router.navigateByUrl('/v1/workspace/facility/facility-a/analysis/dashboard'); await settle(view.fixture);
    const link = () => view.root.querySelector<HTMLAnchorElement>('a.portfolio-tile__name')!;
    const id = link().dataset['browseId'];
    view.canEnter.set(false); link().focus(); link().click(); await settle(view.fixture);
    expect(view.router.url).toContain('/analysis/dashboard');
    view.canEnter.set(true); link().click(); await settle(view.fixture);
    view.canLeave.set(false); view.root.querySelectorAll<HTMLAnchorElement>('a')[1].click(); await settle(view.fixture);
    expect(view.router.url).toContain('/analysis/workbench/');
    view.entries.update(entries => entries.filter(entry => entry.key !== id));
    view.canLeave.set(true); view.root.querySelectorAll<HTMLAnchorElement>('a')[1].click(); await settle(view.fixture);
    await vi.waitFor(() => expect((document.activeElement as HTMLElement).id).toBe('v1-facility-analysis-title'));
    expect(TestBed.inject(WorkspaceNavigationService).routeMotion()).toBe('drill-out');
    view.fixture.destroy();
  });

  it('supports all detail levels, themed scope labels, keyboard menus, narrow layouts and print', async () => {
    await page.viewport(1200, 900);
    const view = setup(4); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    for (const level of ['simple', 'summary', 'detailed'] as const) {
      view.host().inventory.detailControl.setValue(level); await settle(view.fixture);
      expect(view.root.querySelectorAll(`.portfolio-inventory [data-detail="${level}"]`)).toHaveLength(6);
      for (const tile of view.root.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile')) {
        expect(!!tile.querySelector('.portfolio-tile__context .portfolio-tile__analysis-modified')).toBe(level !== 'simple');
        if (level === 'detailed') {
          const heading = tile.querySelector<HTMLElement>('.analysis-snapshot__section-heading')!;
          const button = heading.querySelector<HTMLButtonElement>('button')!;
          expect(button.querySelector('app-ui-icon')?.getAttribute('name')).toBe('monocle');
          expect(button.getBoundingClientRect().height).toBeLessThanOrEqual(44);
          expect(tile.querySelector('.analysis-snapshot__usage')?.textContent).toContain('Used By');
          expect(tile.textContent).not.toContain('Configured');
        }
        const bounds = tile.getBoundingClientRect(), header = tile.querySelector<HTMLElement>('.portfolio-tile__analysis-scope')!.getBoundingClientRect();
        expect(header.top).toBeCloseTo(bounds.top + parseFloat(getComputedStyle(tile).borderTopWidth), 0);
        expect(header.left).toBeCloseTo(bounds.left + parseFloat(getComputedStyle(tile).borderLeftWidth), 0);
        expect(header.right).toBeCloseTo(bounds.right - parseFloat(getComputedStyle(tile).borderRightWidth), 0);
        const chip = tile.querySelector<HTMLElement>('.portfolio-tile__chip')!;
        const icon = chip.querySelector<HTMLElement>('app-ui-icon')!;
        expect(icon).not.toBeNull();
        expect(chip.textContent?.trim()).toMatch(/^(Energy|Water)$/);
        expect(Math.abs(icon.getBoundingClientRect().top + icon.getBoundingClientRect().height / 2 - (chip.getBoundingClientRect().top + chip.getBoundingClientRect().height / 2))).toBeLessThan(2);
      }
    }
    const pageHeader = view.root.querySelector<HTMLElement>('.analysis-inventory__header')!;
    const add = pageHeader.querySelector<HTMLButtonElement>('button')!;
    expect(add.getBoundingClientRect().width).toBeLessThan(pageHeader.getBoundingClientRect().width / 2);
    expect(getComputedStyle(view.root.querySelector('.analysis-inventory__sticky')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(view.root.textContent).not.toMatch(/\bReady\b/);
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      view.root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      await settle(view.fixture);
      for (const label of view.root.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile__analysis-scope')) expect(textContrast(label), `${palette},dark=${dark}`).toBeGreaterThanOrEqual(4.5);
    }
    view.root.className = 'v1-root v1-theme-dark';
    const menu = view.root.querySelector<HTMLButtonElement>('.portfolio-tile__menu-button')!;
    menu.focus(); await userEvent.keyboard('{Enter}'); await settle(view.fixture);
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    await userEvent.keyboard('{Escape}'); await settle(view.fixture); expect(document.activeElement).toBe(menu);
    await page.viewport(390, 800); await settle(view.fixture);
    expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
    view.entries.update(entries => entries.filter(entry => entry.card.category === 'energy')); view.categories.set(['energy']);
    await settle(view.fixture);
    expect(view.root.querySelector('[formControlName="category"]')).toBeNull();
    expect(view.root.querySelector('.portfolio-tile__chip')).toBeNull();
    expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
    await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print', features: [] }); await settle(view.fixture);
    expect(getComputedStyle(view.root.querySelector('.analysis-inventory__toolbar')!).display).toBe('none');
    expect(getComputedStyle(view.root.querySelector('.portfolio-inventory-print')!).display).not.toBe('none');
    view.fixture.destroy();
  });
});
