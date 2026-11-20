import { availableHomeCharts } from './home-widget-view';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { Component, NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { page, cdp } from 'vitest/browser';
import { vi } from 'vitest';
import { LocalStorageService } from 'ngx-webstorage';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceLoaderService } from '@data/account-workspace/account-workspace-loader.service';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { HomeCommandHandler } from '@data/account-workspace/handlers/home-command-handler.service';
import { VisualizationCommandHandler } from '@data/account-workspace/handlers/visualization-command-handler.service';
import { readHomeDashboard, readHomeOwner } from '@data/home/home-record';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { HomeModule } from './home.module';
import { HOME_COMPLETE_RECIPES } from './home-template-catalog.service';
import { HomeDashboardComponent } from './dashboard/dashboard.component';
import { HomeEditor } from './home-editor.service';
import { HomeContext } from './home-context.service';
import { HomeBrowseSession } from './home-browse-session.service';
import { HomeLibrarySave } from './home-library-save.service';
import { homeDefaultGuard, homeLeaveGuard } from './home-navigation.guards';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { VisualizationNavigationService } from '@app/v1/visualizations/visualization-navigation.service';
import { protectedNavigationPreflightGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { homeAccountOwner, homeDefinition } from '@domain/home/testing/home-fixtures';
import { homeDisplayDraft, homeDisplayRaw } from './display-controls/display-controls.component';
import { homeOwnerRoute } from '@app/v1/routing/workspace-route';

@Component({ standalone: false, template: '<div class="v1-workspace__main" style="height: 450px; overflow: auto" [attr.inert]="modal.workspaceBlocked() ? &quot;&quot; : null"><router-outlet/></div><ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class HomeInteractionHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: '<h1>Saved visualization</h1>' })
class SavedDestination {}
@NgModule({ declarations: [HomeInteractionHost], imports: [CommonModule, RouterModule, PortalModule, HomeModule] })
class HomeInteractionModule {}
const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', name: 'Account A' };
const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a' };
const reference = { kind: 'built-in' as const, template: 'home' as const, version: 1 };
const widget = { id: 'HOME.rolling', size: 'full' as const, visibility: 'always' as const, kind: 'built-in-chart' as const,
  reference: { kind: 'built-in' as const, recipe: 'reporting-energy-rolling', version: 1, owner: homeAccountOwner }, inherit: ['period' as const], overrides: {} };
const routes = ['account/:accountGuid', 'facility/:facilityGuid'].flatMap(owner => [
  { path: `v1/workspace/${owner}/home/overview`, component: HomeDashboardComponent, canActivate: [protectedNavigationPreflightGuard, homeDefaultGuard], canDeactivate: [homeLeaveGuard], runGuardsAndResolvers: 'always' as const },
  { path: `v1/workspace/${owner}/home/built-in/:template/:version`, component: HomeDashboardComponent, canActivate: [protectedNavigationPreflightGuard], canDeactivate: [homeLeaveGuard], runGuardsAndResolvers: 'always' as const },
  { path: `v1/workspace/${owner}/home/dashboard/:dashboardGuid`, component: HomeDashboardComponent, canActivate: [protectedNavigationPreflightGuard], canDeactivate: [homeLeaveGuard], runGuardsAndResolvers: 'always' as const }
]);

describe('Home4 explicit preferences, library save and return in Chromium', () => {
  let harness: IndexedDbTestHarness, store: AccountWorkspaceStore, workspace: AccountWorkspaceService, router: Router, fixture: ComponentFixture<HomeInteractionHost>;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HomeInteractionModule], providers: [provideRouter([...routes,
      { path: 'v1/workspace/account/:accountGuid/visualization/workbench/:visualizationGuid', component: SavedDestination, canActivate: [protectedNavigationPreflightGuard] }]),
      { provide: HOME_COMPLETE_RECIPES, useValue: [{ template: 'home', label: 'Complete boundary fixture', description: 'Test-only catalog contract, not production Home composition', complete: true,
        build: (_account: string, owner: typeof homeAccountOwner) => ({ template: 'home', version: 1, charts: [], dashboard: { ...homeDefinition([{ ...widget, reference: { ...widget.reference, owner } }]), name: 'Test Home' } }) }] },
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('home4-interactions'); await harness.seed({ accounts: [account], facilities: [facility] });
    store = TestBed.inject(AccountWorkspaceStore); workspace = TestBed.inject(AccountWorkspaceService); router = TestBed.inject(Router);
    await workspace.selectAccount(account.guid);
    fixture = TestBed.createComponent(HomeInteractionHost); fixture.nativeElement.className = 'v1-root';
    await router.navigate(homeOwnerRoute(homeAccountOwner)); await settle();
  });
  afterEach(async () => { fixture?.destroy(); vi.restoreAllMocks(); await harness?.destroy(); await page.viewport(1200, 900); });
  async function settle() { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
  async function click(name: string) {
    const scope = fixture.nativeElement.querySelector('[role=dialog]') ? page.getByRole('dialog') : page;
    await scope.getByRole('button', { name, exact: true }).click(); await settle();
  }
  async function saved() { await vi.waitFor(() => { fixture.detectChanges(); expect(TestBed.inject(HomeEditor).saving()).toBe(false); }); await settle(); }
  function definition() { const read = readHomeDashboard(store.homeDashboards()[0]); if (read.state !== 'valid') throw new Error('Expected readable customization'); return read.value; }

  it('views without writes, cancels a protected built-in draft, saves preferences once, reloads, restores and preserves deletion intent', async () => {
    expect(router.url).toContain('/home/built-in/home/1');
    expect(await harness.getAll('homeOwners')).toEqual([]); expect(await harness.getAll('homeDashboards')).toEqual([]); expect(await harness.getAll('savedVisualizations')).toEqual([]);
    await click('Customize chart in dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('Unsaved Home');
    const leave = router.navigate(homeOwnerRoute({ kind: 'facility', guid: facility.guid }));
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Leave unsaved Home changes?'); });
    expect(page.getByRole('dialog')).toBeDefined(); await click('Keep current Home state'); await expect(leave).resolves.toBe(false);
    expect(TestBed.inject(HomeEditor).session()?.definition?.name).toBe('Unsaved Home');
    await click('Cancel editing'); await click('Discard draft');
    expect(store.homeDashboards()).toEqual([]); expect(store.savedVisualizations()).toEqual([]);
    await click('Edit dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('My Home'); await click('Save dashboard'); await saved();
    expect(store.homeDashboards()).toHaveLength(1); expect(store.homeOwners()).toHaveLength(1); expect(store.savedVisualizations()).toEqual([]);
    expect(router.url).toContain('/home/built-in/home/1'); expect(definition().name).toBe('My Home');
    expect(store.homeDashboards()[0].template?.baseline.name).toBe('Test Home');
    expect(store.homeDashboards()[0].template?.customized).toBe(true);
    const owner = readHomeOwner(store.homeOwners()[0]); expect(owner.state === 'valid' && owner.value.views?.catalog).toEqual([reference]);
    const loaded = await TestBed.inject(AccountWorkspaceLoaderService).load(account.guid); expect(loaded.homeDashboards[0]).toEqual(store.homeDashboards()[0]);
    await click('Restore from template'); await click('Review restore'); await click('Restore dashboard'); await saved();
    expect(definition().name).toBe('Test Home'); expect(store.savedVisualizations()).toEqual([]);
    await click('Delete dashboard'); await click('Delete dashboard'); await saved();
    expect(store.homeDashboards()).toEqual([]); expect(TestBed.inject(HomeContext).entries()).toEqual([]);
    await workspace.reloadActiveWorkspace(false); expect(TestBed.inject(HomeContext).entries()).toEqual([]);
    await router.navigate(homeOwnerRoute({ kind: 'facility', guid: facility.guid })); await settle();
    expect(TestBed.inject(HomeContext).selected()?.reference).toEqual(reference); expect(store.homeDashboards()).toEqual([]);
    await harness.reopen(); expect((await TestBed.inject(AccountWorkspaceLoaderService).load(account.guid)).homeDashboards).toEqual([]);
  });

  it('keeps browsing local, retains invalid dates, saves defaults through a stable rejected proposal and recovers publication without replay', async () => {
    const browse = TestBed.inject(HomeBrowseSession), editor = TestBed.inject(HomeEditor), handler = TestBed.inject(HomeCommandHandler);
    const draft = homeDisplayDraft({ ...homeDisplayRaw({}), period: 'fixed', start: '2024-01', end: '2024-12' }, {});
    browse.update(draft); browse.update({ ...draft, raw: { ...draft.raw, end: '' }, valid: false }); await settle();
    expect(browse.effective()).toEqual(draft.value); expect(store.homeOwners()).toEqual([]);
    browse.update(draft); const execute = vi.spyOn(handler, 'execute').mockRejectedValueOnce(new Error('Storage unavailable'));
    await click('Save as dashboard defaults'); await saved();
    const proposal = editor.session()?.proposal; expect(editor.session()?.definition?.defaults).toEqual(draft.value); expect(store.homeDashboards()).toEqual([]);
    vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    await click('Retry save'); await saved(); expect(editor.session()?.outcome?.state).toBe('refresh-required');
    expect(await harness.getAll('homeDashboards')).toHaveLength(1); const count = execute.mock.calls.length;
    await click('Refresh saved change'); await saved(); expect(execute).toHaveBeenCalledTimes(count);
    expect(definition().defaults).toEqual(draft.value); expect(store.savedVisualizations()).toEqual([]);
    expect(proposal?.operationGuid).toBe(execute.mock.calls[1][0].operationGuid);
  });

  it('creates one reusable visualization only after explicit save, checks stale Home revisions and refreshes without a second write', async () => {
    const library = TestBed.inject(HomeLibrarySave), handler = TestBed.inject(VisualizationCommandHandler);
    await click('Save as visualization'); await page.getByLabelText('Visualization name', { exact: true }).fill('Reusable progress');
    expect(store.savedVisualizations()).toEqual([]); await click('Cancel library save'); expect(store.savedVisualizations()).toEqual([]);
    await click('Save as visualization'); await page.getByLabelText('Visualization name', { exact: true }).fill('Reusable progress');
    const create = vi.spyOn(handler, 'create'); vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    await click('Save to visualization library'); await vi.waitFor(() => { fixture.detectChanges(); expect(library.refreshRequired()).toBe(true); });
    const guid = library.proposal()!.guid; expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
    await click('Retry library refresh'); await vi.waitFor(() => { fixture.detectChanges(); expect(library.saved()?.guid).toBe(guid); });
    expect(create).toHaveBeenCalledTimes(1); expect(store.homeOwners()).toEqual([]); expect(store.homeDashboards()).toEqual([]);
    const read = readSavedVisualization(store.savedVisualizations()[0]); expect('definition' in read && read.definition.sources[0]).toMatchObject({ reporting: { kind: 'reporting', owner: homeAccountOwner } });
    expect(fixture.nativeElement.textContent).toContain('still uses its built-in configuration');
    await click('Save as visualization');
    await TestBed.inject(HomeCommands).submit(TestBed.inject(HomeCommands).prepareConfigure(homeAccountOwner, { version: 1, initialized: true, dashboardOrder: [], deletedStarters: [], views: { version: 1, catalog: [reference], order: [reference], default: reference, hidden: [], deleted: [] } }));
    await click('Save to visualization library'); await vi.waitFor(() => { fixture.detectChanges(); expect(library.saving()).toBe(false); });
    expect(library.proposal()).toBeDefined(); expect(store.savedVisualizations()).toHaveLength(1); await click('Cancel library save');
  });

  it('explicitly replaces a built-in widget with the reviewed saved link without another library write', async () => {
    const library = TestBed.inject(HomeLibrarySave);
    await click('Save as visualization'); await click('Save to visualization library');
    await vi.waitFor(() => { fixture.detectChanges(); expect(library.saved()).toBeDefined(); });
    const guid = library.saved()!.guid;
    expect(availableHomeCharts(store.snapshot()!).map(item => item.guid), JSON.stringify({ read: readSavedVisualization(store.savedVisualizations()[0]), snapshot: store.snapshot()?.account })).toContain(guid);
    await click('Edit dashboard'); await page.getByRole('combobox', { name: 'Replace with saved visualization', exact: true }).selectOptions(guid); await settle();
    expect(TestBed.inject(HomeEditor).canSave()).toBe(false);
    await click('Use selected chart'); await click('Save dashboard'); await saved();
    expect(definition().widgets[0]).toMatchObject({ kind: 'visualization', visualizationGuid: guid });
    expect(store.savedVisualizations()).toHaveLength(1); expect(store.homeDashboards()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('committed shared edits apply here');
  });

  it('returns to the reviewed Home widget with session filters, then falls back after deletion without reviving it', async () => {
    const browse = TestBed.inject(HomeBrowseSession), navigation = TestBed.inject(VisualizationNavigationService), home = TestBed.inject(HomeContext);
    const draft = homeDisplayDraft({ ...homeDisplayRaw({}), period: 'all-history' }, {}); browse.update(draft);
    const token = { accountGuid: account.guid, owner: homeAccountOwner, reference, widgetId: widget.id, chartGuid: 'chart-a' };
    const main = fixture.nativeElement.querySelector('.v1-workspace__main') as HTMLElement; main.scrollTop = 180; const scroll = main.scrollTop; expect(scroll).toBeGreaterThan(0);
    expect(await navigation.openFromHome(token)).toBe(true); await settle(); expect(router.url).toContain('workbench/chart-a');
    expect(await navigation.returnToDashboard(account.guid)).toBe(true); await settle(); expect(browse.current()?.draft).toEqual(draft); expect(Math.abs(main.scrollTop - scroll)).toBeLessThan(2);
    expect(document.activeElement?.closest('[data-widget-id]')?.getAttribute('data-widget-id')).toBe(widget.id);
    await navigation.openFromHome(token); await settle();
    const commands = TestBed.inject(HomeCommands);
    await commands.submit(commands.prepareConfigure(homeAccountOwner, { version: 1, initialized: true, dashboardOrder: [], deletedStarters: [], views: { version: 1, catalog: [reference], order: [reference], hidden: [], deleted: [reference] } }));
    await navigation.returnToDashboard(account.guid); await settle(); expect(home.entries()).toEqual([]); expect(router.url).toContain('home/overview');
    expect(document.activeElement?.id).toBe('home-title');
  });
});
