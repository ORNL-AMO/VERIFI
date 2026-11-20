import { Component, NgModule, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { page, userEvent, cdp } from 'vitest/browser';
import { vi } from 'vitest';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom } from 'rxjs';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { AccountWorkspaceLoaderService } from '@data/account-workspace/account-workspace-loader.service';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { storageBlueprints } from '@data/home/testing/home-command-fixtures';
import { HOME_COMPLETE_RECIPES } from '../home-template-catalog.service';
import { HomeWidgetBoardComponent } from '../widget-board/widget-board.component';
import { HomePrintState } from '../home-print-state.service';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { homeOwnerState, chartWidget } from '@domain/home/testing/home-fixtures';
import { homeShortcutChoices } from '../home-widget-view';
import { getNewIdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { homeDefinition } from '@domain/home/testing/home-fixtures';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { HomeCommandHandler } from '@data/account-workspace/handlers/home-command-handler.service';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { readHomeDashboard, readHomeOwner } from '@data/home/home-record';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { PrimaryRailComponent } from '@app/v1/shell/primary-rail/primary-rail.component';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { protectedNavigationPreflightGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { HomeModule } from '../home.module';
import { HomeEditor } from '../home-editor.service';
import { homeDefaultGuard, homeLeaveGuard } from '../home-navigation.guards';
import { HomeDashboardComponent } from './dashboard.component';

@Component({ standalone: false, template: '<app-primary-rail/><div [attr.inert]="modal.workspaceBlocked() ? &quot;&quot; : null"><router-outlet/></div><ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class HomeBrowserHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: '<h1>Another workspace section</h1>' })
class OtherSection {}
@NgModule({ declarations: [HomeBrowserHost, PrimaryRailComponent], imports: [CommonModule, RouterModule, PortalModule, IconsModule, HomeModule] })
class HomeBrowserModule {}

const account = { ...getNewIdbAccount(), guid: 'account-a', id: 1, name: 'Account A' };
const accountB = { ...getNewIdbAccount(), guid: 'account-b', id: 2, name: 'Account B' };
const facility = { ...getNewIdbFacility(account), guid: 'facility-a', id: 1, name: 'Facility A' };
const homeRoutes = ['account/:accountGuid', 'facility/:facilityGuid'].flatMap(owner => [
  { path: `v1/workspace/${owner}/home/overview`, component: HomeDashboardComponent, canActivate: [protectedNavigationPreflightGuard, homeDefaultGuard], canDeactivate: [homeLeaveGuard], runGuardsAndResolvers: 'always' as const },
  { path: `v1/workspace/${owner}/home/dashboard/:dashboardGuid`, component: HomeDashboardComponent, canActivate: [protectedNavigationPreflightGuard], canDeactivate: [homeLeaveGuard], runGuardsAndResolvers: 'always' as const }
]);

describe('Home lifecycle with native storage and routing in Chromium', () => {
  let harness: IndexedDbTestHarness, store: AccountWorkspaceStore, workspace: AccountWorkspaceService, router: Router, fixture: ComponentFixture<HomeBrowserHost>, root: HTMLElement;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HomeBrowserModule], providers: [provideRouter([...homeRoutes,
      { path: 'v1/workspace/account/:accountGuid/analysis/dashboard', component: OtherSection, canActivate: [protectedNavigationPreflightGuard] },
      { path: 'elsewhere', component: OtherSection, canActivate: [protectedNavigationPreflightGuard] }]),
      { provide: HOME_COMPLETE_RECIPES, useValue: [{ template: 'home', label: 'Complete test recipe', description: 'Native catalog boundary fixture; not a shipped starter composition', complete: true,
        build: (accountGuid: string, owner: import('@domain/home/home-dashboard').HomeOwner) => { const recipe = storageBlueprints(owner, accountGuid)[0]; return { ...recipe, dashboard: { ...recipe.dashboard, name: 'Complete test recipe' } }; } }] },
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [account, accountB] } },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), accountTodos: () => [], selectedFacilityTodos: () => [], discardedItems: () => [] } }
    ] });
    harness = await IndexedDbTestHarness.create('home3-ui');
    await harness.seed({ accounts: [account, accountB], facilities: [facility] });
    store = TestBed.inject(AccountWorkspaceStore); workspace = TestBed.inject(AccountWorkspaceService); router = TestBed.inject(Router);
    await workspace.selectAccount(account.guid);
    fixture = TestBed.createComponent(HomeBrowserHost); root = fixture.nativeElement; root.className = 'v1-root'; root.style.width = '100%';
    await router.navigateByUrl('/v1/workspace/account/account-a/home/overview'); await settle();
  });
  afterEach(async () => { await (cdp() as { send(method: string, params: unknown): Promise<void> }).send('Emulation.setEmulatedMedia', { media: '' }); await page.viewport(1200, 900); fixture?.destroy(); vi.restoreAllMocks(); await harness?.destroy(); });
  async function settle() { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
  async function click(name: string) {
    const scope = root.querySelector('[role=dialog]') ? page.getByRole('dialog') : page;
    await scope.getByRole('button', { name, exact: true }).click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(TestBed.inject(HomeEditor).saving()).toBe(false); });
    await settle();
  }
  async function create(name: string) {
    await click('Create dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill(name); await click('Save dashboard');
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('h1')?.textContent).toBe(name); });
    return store.homeDashboards().find(record => { const read = readHomeDashboard(record); return read.state === 'valid' && read.value.name === name; })!;
  }
  function definition(guid: string) { const read = readHomeDashboard(store.homeDashboards().find(record => record.guid === guid)!); if (read.state !== 'valid') throw new Error('Unreadable test dashboard'); return read.value; }

  async function addNote(title: string, text: string) {
    await page.getByRole('combobox', { name: 'Widget type', exact: true }).selectOptions('note'); await settle();
    await click('Add widget to draft');
    const note = page.getByRole('article', { name: 'Note', exact: true });
    await note.getByRole('textbox', { name: 'Widget title', exact: true }).fill(title); await settle();
    await page.getByRole('article', { name: title, exact: true }).getByRole('textbox', { name: 'Note text', exact: true }).fill(text); await settle();
    return TestBed.inject(HomeEditor).session()!.definition!.widgets.at(-1)!;
  }
  function widgetCard(id: string) { return [...root.querySelectorAll<HTMLElement>('[data-widget-id]')].find(card => card.dataset['widgetId'] === id)!; }
  function widgetIds() { return [...root.querySelectorAll<HTMLElement>('[data-widget-id]')].map(card => card.dataset['widgetId']); }

  async function pointerGesture(source: HTMLElement, destination: () => { x: number; y: number }) {
    source.scrollIntoView({ block: 'center' }); await settle();
    const frame = window.frameElement?.getBoundingClientRect(), rect = source.getBoundingClientRect();
    const scaleX = frame ? frame.width / window.innerWidth : 1, scaleY = frame ? frame.height / window.innerHeight : 1;
    const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, end = destination();
    const client = cdp() as { send(method: string, params: unknown): Promise<void> };
    const send = (type: string, point: { x: number; y: number }, buttons: number) => client.send('Input.dispatchMouseEvent', { type,
      x: point.x * scaleX + (frame?.left ?? 0), y: point.y * scaleY + (frame?.top ?? 0), button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1 });
    await send('mouseMoved', start, 0); await send('mousePressed', start, 1);
    await send('mouseMoved', { x: start.x + 8, y: start.y + 8 }, 1);
    await send('mouseMoved', { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, 1);
    await send('mouseMoved', end, 1); await send('mouseReleased', end, 0); await settle();
  }

  it('edits plain notes with keyboard reorder/resize, retains DOM order and restores focus after removal', async () => {
    const board = await create('Keyboard widgets'); await click('Edit dashboard');
    const first = await addNote('First note', '<b>Literal note</b>'), second = await addNote('Second note', 'Second text');
    expect(document.activeElement?.getAttribute('aria-label')).not.toBe('unavailable');
    expect(widgetCard(first.id).querySelector('b')).toBeNull();
    const earlier = widgetCard(second.id).querySelector<HTMLButtonElement>('[aria-label="Move Second note earlier"]')!;
    earlier.focus(); await userEvent.keyboard('{Enter}'); await settle();
    expect(widgetIds()).toEqual([second.id, first.id]); expect(document.activeElement).toBe(widgetCard(second.id).querySelector('h2'));
    await page.getByRole('article', { name: 'Second note', exact: true }).getByRole('radio', { name: 'Half', exact: true }).click(); await settle();
    expect(TestBed.inject(HomeEditor).session()?.definition?.widgets[0].size).toBe('half');
    await userEvent.keyboard('{ArrowRight}'); await settle(); expect(TestBed.inject(HomeEditor).session()?.definition?.widgets[0].size).toBe('full');
    await click('Save dashboard'); expect(definition(board.guid).widgets.map(widget => widget.id)).toEqual([second.id, first.id]);
    await workspace.reloadActiveWorkspace(false); await settle(); expect(widgetIds()).toEqual([second.id, first.id]);
    await click('Edit dashboard'); await click('Remove Second note'); await click('Cancel');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove Second note');
    await click('Remove Second note'); await click('Remove widget');
    expect(widgetIds()).toEqual([first.id]); expect(document.activeElement).toBe(widgetCard(first.id).querySelector('h2'));
    await click('Save dashboard'); expect(definition(board.guid).widgets).toHaveLength(1);
  });

  it('uses real pointer movement and resize handles with the same saved source order', async () => {
    await page.viewport(1200, 1000); const board = await create('Pointer widgets'); await click('Edit dashboard');
    const first = await addNote('Pointer first', 'A'), second = await addNote('Pointer second', 'B');
    for (const name of ['Pointer first', 'Pointer second']) { await page.getByRole('article', { name, exact: true }).getByRole('radio', { name: 'Half', exact: true }).click(); await settle(); }
    const drops = vi.spyOn(HomeWidgetBoardComponent.prototype, 'drop');
    const handle = widgetCard(first.id).querySelector<HTMLElement>('[aria-label="Drag Pointer first to reorder"]')!;
    await pointerGesture(handle, () => { const target = widgetCard(second.id).getBoundingClientRect(); return { x: target.left + 30, y: target.top + 25 }; });
    expect(widgetIds(), JSON.stringify(drops.mock.calls.map(([event]) => ({ from: event.previousIndex, to: event.currentIndex, data: event.item.data })))).toEqual([second.id, first.id]);
    const resize = () => widgetCard(second.id).querySelector<HTMLElement>('.widget-resize')!;
    await pointerGesture(resize(), () => { const target = resize().getBoundingClientRect(); return { x: target.left + target.width / 2 + 70, y: target.top + target.height / 2 }; });
    expect(TestBed.inject(HomeEditor).session()?.definition?.widgets[0].size).toBe('full');
    await pointerGesture(resize(), () => { const target = resize().getBoundingClientRect(); return { x: target.left + target.width / 2 - 70, y: target.top + target.height / 2 }; });
    expect(TestBed.inject(HomeEditor).session()?.definition?.widgets[0].size).toBe('half');
    await click('Save dashboard'); expect(definition(board.guid).widgets.map(widget => [widget.id, widget.size])).toEqual([[second.id, 'half'], [first.id, 'half']]);
  });

  it('stacks narrow layouts, preserves 24rem Half content, and prints committed order while retaining the draft', async () => {
    await page.viewport(1200, 1000); const board = await create('Responsive widgets'); await click('Edit dashboard');
    const first = await addNote('A long widget title that wraps naturally across the available content width', 'First'), second = await addNote('Second responsive note', 'Second');
    for (const name of [first.title!, second.title!]) { await page.getByRole('article', { name, exact: true }).getByRole('radio', { name: 'Half', exact: true }).click(); await settle(); }
    await click('Save dashboard');
    const width = (card: HTMLElement) => { const style = getComputedStyle(card); return card.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth); };
    expect(widgetCard(first.id).getBoundingClientRect().top).toBeCloseTo(widgetCard(second.id).getBoundingClientRect().top, 1);
    expect(width(widgetCard(first.id))).toBeGreaterThanOrEqual(24 * parseFloat(getComputedStyle(document.documentElement).fontSize));
    await page.screenshot({ path: '/tmp/home3-visual-evidence/home-widgets-wide.png' });
    const narrowWidth = Math.floor(52 * parseFloat(getComputedStyle(document.documentElement).fontSize) - 20);
    await page.viewport(narrowWidth, 1000); await vi.waitFor(() => expect(window.innerWidth).toBe(narrowWidth)); await settle(); expect(widgetCard(second.id).getBoundingClientRect().top).toBeGreaterThan(widgetCard(first.id).getBoundingClientRect().top);
    await page.viewport(390, 1000); await vi.waitFor(() => expect(window.innerWidth).toBe(390)); root.classList.add('v1-theme-dark'); await settle();
    expect(widgetCard(second.id).getBoundingClientRect().top).toBeGreaterThan(widgetCard(first.id).getBoundingClientRect().top);
    expect(widgetCard(first.id).scrollWidth).toBeLessThanOrEqual(widgetCard(first.id).clientWidth + 1);
    await page.screenshot({ path: '/tmp/home3-visual-evidence/home-widgets-narrow-dark.png' });
    await click('Edit dashboard'); TestBed.inject(HomeEditor).moveWidget(second.id, 0); await settle();
    const media = cdp() as { send(method: string, params: unknown): Promise<void> };
    await media.send('Emulation.setEmulatedMedia', { media: 'print' });
    await vi.waitFor(() => { fixture.detectChanges(); expect(TestBed.inject(HomePrintState).active()).toBe(true); }); await settle();
    expect(widgetIds()).toEqual([first.id, second.id]); expect(root.querySelector('app-home-widget-card button')).toBeNull();
    expect(getComputedStyle(root.querySelector('.home-widget-grid')!).display).toBe('block');
    await media.send('Emulation.setEmulatedMedia', { media: '' }); await vi.waitFor(() => expect(TestBed.inject(HomePrintState).active()).toBe(false)); await settle();
    expect(widgetIds()).toEqual([second.id, first.id]); expect(TestBed.inject(HomeEditor).needsProtection()).toBe(true);
    expect(definition(board.guid).widgets.map(widget => widget.id)).toEqual([first.id, second.id]);
  });

  it('links charts and typed shortcuts, protects unfinished choices, duplicates links and restores fresh definitions without deleting former charts', async () => {
    const chart = { ...getNewIdbSavedVisualization(createVisualizationDefinition('Existing saved chart', account.guid, { kind: 'all' }, 'utility')), id: 1 };
    await harness.seed({ savedVisualizations: [chart] }); await workspace.reloadActiveWorkspace(false);
    const original = await create('Linked widgets'); await click('Edit dashboard');
    await page.getByRole('combobox', { name: 'Widget type', exact: true }).selectOptions('visualization'); await settle();
    await page.getByRole('button', { name: /Existing saved chart/ }).click(); await settle();
    expect(TestBed.inject(HomeEditor).pendingWidgetChoice()).toBe(true);
    const leaving = router.navigateByUrl('/elsewhere'); await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role=dialog]')).not.toBeNull(); });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(await leaving).toBe(false); await settle();
    await workspace.reloadActiveWorkspace(false); await settle();
    expect(TestBed.inject(HomeEditor).session()?.widgetChoice?.visualizationGuids).toEqual([chart.guid]);
    expect(TestBed.inject(HomeEditor).pendingWidgetChoice()).toBe(true);
    await click('Add widget to draft');
    await page.getByRole('combobox', { name: 'Widget type', exact: true }).selectOptions('shortcut'); await settle();
    await page.getByRole('button', { name: 'Facility A (Facility) · Settings', exact: true }).click(); await settle(); await click('Add widget to draft');
    await click('Save dashboard');
    const linked = definition(original.guid).widgets.find(widget => widget.kind === 'visualization')!;
    expect(linked).toMatchObject({ visualizationGuid: chart.guid, inherit: [], overrides: {} });
    expect(root.querySelector('app-home-widget-card a')?.getAttribute('href')).toBe('/v1/workspace/facility/facility-a/settings/profile');
    await click('Duplicate dashboard');
    const copy = store.homeDashboards().find(record => record.guid !== original.guid)!;
    expect(definition(copy.guid).widgets[0]).toMatchObject({ visualizationGuid: chart.guid }); expect(definition(copy.guid).widgets[0].id).not.toBe(linked.id);
    expect(store.savedVisualizations()).toHaveLength(1); await click('Set as default');
    const ownerBefore = TestBed.inject(HomeCommands).ownerView({ kind: 'account', guid: account.guid }).state!;
    const identity = { id: copy.id, guid: copy.guid, createdDate: copy.createdDate };
    await click('Restore from template'); await page.getByRole('combobox', { name: 'Template', exact: true }).selectOptions('home'); await settle(); await click('Review restore');
    expect(root.querySelector('[role=dialog]')?.textContent).toContain('Fresh template visualizations will be created'); await click('Restore dashboard');
    expect(store.homeDashboards().find(record => record.guid === copy.guid)).toMatchObject(identity);
    const freshLink = definition(copy.guid).widgets.find(widget => widget.kind === 'visualization')!;
    expect(freshLink).not.toMatchObject({ visualizationGuid: chart.guid }); expect(store.savedVisualizations()).toHaveLength(2);
    expect(TestBed.inject(HomeCommands).ownerView({ kind: 'account', guid: account.guid }).state).toMatchObject({ dashboardOrder: ownerBefore.dashboardOrder, defaultDashboardGuid: copy.guid });
    await click('Delete dashboard'); await click('Delete dashboard'); expect(store.savedVisualizations()).toHaveLength(2);
    await click('Edit dashboard'); await click('Remove Existing saved chart'); await click('Remove widget'); await click('Save dashboard');
    expect(definition(original.guid).widgets.some(widget => widget.kind === 'visualization')).toBe(false); expect(store.savedVisualizations()).toHaveLength(2);
  });

  it('keeps blocked references/preferences through unrelated widget edits and acknowledges only an explicitly chosen shortcut target', async () => {
    const chart = { ...getNewIdbSavedVisualization(createVisualizationDefinition('Coincident chart', account.guid, { kind: 'all' }, 'utility')), id: 1 };
    const meter = { ...getNewIdbUtilityMeter(facility.guid, account.guid, false, 'MMBtu'), id: 1, guid: 'coincident-meter', name: 'Coincident meter' };
    const shortcut = { id: 'shortcut with spaces:1', kind: 'shortcut' as const, size: 'half' as const, visibility: 'always' as const,
      destination: { area: 'data' as const, owner: { kind: 'facility' as const, guid: facility.guid }, resource: { kind: 'meter' as const, guid: meter.guid } } };
    const chartLink = chartWidget(chart.guid, 'chart.with.punctuation');
    const paths = [{ path: `widgets.${chartLink.id}.visualizationGuid`, kind: 'visualization' as const, guid: chart.guid, reason: 'not-transferred' as const },
      { path: `widgets.${shortcut.id}.destination.resource.guid`, kind: 'meter' as const, guid: meter.guid, reason: 'not-transferred' as const }];
    const board = { ...getNewIdbHomeDashboard(account.guid, { kind: 'account', guid: account.guid }, homeDefinition([chartLink, shortcut])), id: 1, preservation: { references: paths, transfers: [] } };
    const owner = { ...getNewIdbHomeOwner(account.guid, { kind: 'account', guid: account.guid }, { ...homeOwnerState(['unavailable-order', board.guid]), defaultDashboardGuid: 'unavailable-default' }), id: 1,
      preservation: { references: [{ path: 'defaultDashboardGuid', kind: 'dashboard' as const, guid: 'unavailable-default', reason: 'not-transferred' as const }], transfers: [] } };
    await harness.seed({ savedVisualizations: [chart], utilityMeter: [meter], homeDashboards: [board], homeOwners: [owner] }); await workspace.reloadActiveWorkspace(false);
    await router.navigateByUrl(`/v1/workspace/account/account-a/home/dashboard/${board.guid}`); await settle(); await click('Edit dashboard');
    await page.getByRole('article', { name: 'Saved visualization', exact: true }).getByRole('radio', { name: 'Full', exact: true }).click();
    await page.getByRole('textbox', { name: 'Dashboard name', exact: true }).fill('Unrelated rename'); await click('Save dashboard');
    expect(store.homeDashboards()[0].preservation?.references).toEqual(paths); expect(store.homeOwners()[0].state).toEqual(owner.state); expect(store.homeOwners()[0].preservation).toEqual(owner.preservation);
    await click('Edit dashboard');
    const choice = homeShortcutChoices(store.snapshot()!).find(choice => choice.destination.resource?.guid === meter.guid)!;
    await page.getByRole('combobox', { name: 'Internal destination', exact: true }).selectOptions(choice.key); await settle(); await click('Save dashboard');
    expect(store.homeDashboards()[0].preservation?.references).toEqual([paths[0]]); expect(store.homeOwners()[0].state).toEqual(owner.state);
    expect(store.savedVisualizations()).toHaveLength(1); expect(store.meters()).toHaveLength(1);
  });

  it('saves/reopens owner-local dashboards, uses defaults through the real rail, and preserves initialized-empty sets', async () => {
    expect(await harness.getAll('homeOwners')).toEqual([]);
    const first = await create('First board'), second = await create('Second board');
    await click('Set as default');
    await click('Restore from template'); await click('Review restore');
    expect(root.querySelector('[role=dialog]')?.textContent).toContain('identity, sidebar position, visibility and selected-default choices remain');
    await click('Restore dashboard');
    expect(definition(second.guid).name).toBe('Blank');
    expect(TestBed.inject(HomeCommands).ownerView({ kind: 'account', guid: account.guid }).defaultDashboardGuid).toBe(second.guid);
    await router.navigateByUrl('/v1/workspace/account/account-a/analysis/dashboard'); await settle(); await click('Home');
    expect(router.url).toContain(`/home/dashboard/${second.guid}`);
    await router.navigateByUrl('/v1/workspace/facility/facility-a/home/overview'); await settle();
    expect(store.homeDashboards()).toHaveLength(2); expect(root.textContent).toContain('No dashboards');
    const facilityBoard = await create('Facility board'); expect(facilityBoard.facilityId).toBe('facility-a');
    await workspace.selectAccount(account.guid); // Reload the committed graph, with a fresh workspace publication.
    await router.navigateByUrl('/v1/workspace/account/account-a/home/overview'); await settle();
    expect(router.url).toContain(second.guid); expect(definition(first.guid).name).toBe('First board');
    await router.navigateByUrl('/v1/workspace/account/account-a/home/dashboard/deleted'); await settle();
    expect(root.textContent).toContain('missing, hidden, or belongs to another owner');
    await router.navigateByUrl(`/v1/workspace/account/account-a/home/dashboard/${second.guid}`); await settle();
    await click('Delete dashboard'); await click('Cancel');
    expect(document.activeElement?.textContent?.trim()).toBe('Delete dashboard');
    await click('Delete dashboard'); await click('Delete dashboard');
    expect(store.homeDashboards().some(record => record.guid === second.guid)).toBe(false);
    await click('Delete dashboard'); await click('Delete dashboard');
    expect(store.homeDashboards().map(record => record.guid)).toEqual([facilityBoard.guid]);
    const owner = store.homeOwners().find(record => !record.facilityId)!;
    expect(readHomeOwner(owner)).toMatchObject({ state: 'valid', value: { initialized: true, dashboardOrder: [] } });
    await workspace.reloadActiveWorkspace(false); await router.navigateByUrl('/v1/workspace/account/account-a/home/overview'); await settle();
    expect(root.textContent).toContain('No dashboards'); expect(await harness.getAll('homeDashboards')).toHaveLength(1);
    fixture.destroy(); fixture = undefined!; await harness.reopen();
    const reopened = await TestBed.inject(AccountWorkspaceLoaderService).load(account.guid);
    expect(reopened.homeDashboards.map(record => record.guid)).toEqual([facilityBoard.guid]);
    expect(readHomeOwner(reopened.homeOwners.find(record => !record.facilityId)!)).toMatchObject({ state: 'valid', value: { initialized: true, dashboardOrder: [] } });
  });

  it('guards dashboard, owner, route and account transitions and restores focus after cancellation', async () => {
    const board = await create('Protected board'); const other = await create('Other board');
    await router.navigateByUrl(`/v1/workspace/account/account-a/home/dashboard/${board.guid}`); await settle();
    await click('Edit dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('Unsaved name');
    await settle(); const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
    for (const destination of [`/v1/workspace/account/account-a/home/dashboard/${other.guid}`, '/v1/workspace/facility/facility-a/home/overview', '/elsewhere']) {
      const navigating = router.navigateByUrl(destination);
      await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role="dialog"]')).not.toBeNull(); });
      await page.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(await navigating).toBe(false); await settle();
      expect((root.querySelector('#home-name') as HTMLInputElement).value).toBe('Unsaved name');
      expect(document.activeElement).toBe(root.querySelector('#home-name'));
    }
    const switching = TestBed.inject(WorkspaceNavigationService).openWorkspace(accountB.guid);
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role="dialog"]')).not.toBeNull(); });
    expect(store.account()?.guid).toBe(account.guid);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await switching; expect(store.account()?.guid).toBe(account.guid);
    const allowed = TestBed.inject(WorkspaceNavigationService).openWorkspace(accountB.guid);
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role="dialog"]')).not.toBeNull(); });
    await page.getByRole('button', { name: 'Discard and continue', exact: true }).click(); await allowed; await settle();
    expect(store.account()?.guid).toBe(accountB.guid); expect(store.homeDashboards()).toEqual([]);
    expect(await harness.getAll('homeDashboards')).toHaveLength(2);
  });

  it('acknowledges a saved receipt departure once across composed router and account guards, retaining recovery on return', async () => {
    const defaultBoard = await create('Default board');
    const board = await create('Pending publication');
    await click('Edit dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('Already saved');
    const reload = vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    await click('Save dashboard'); reload.mockRestore();
    const nativeDiscard = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const editor = TestBed.inject(HomeEditor), operation = editor.session()!.proposal!.operationGuid;
    const leaving = router.navigateByUrl('/v1/workspace/account/account-a/home/overview');
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role=dialog]')).not.toBeNull(); });
    await page.getByRole('button', { name: 'Leave and recover later', exact: true }).click();
    expect(await leaving).toBe(true); await settle(); expect(root.querySelector('[role=dialog]')).toBeNull();
    expect(router.url).toContain(defaultBoard.guid);
    await router.navigateByUrl(`/v1/workspace/account/account-a/home/dashboard/${board.guid}`); await settle();
    expect(editor.session()?.proposal?.operationGuid).toBe(operation); expect(editor.needsProtection()).toBe(true);
    const switching = TestBed.inject(WorkspaceNavigationService).openWorkspace(accountB.guid);
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role=dialog]')).not.toBeNull(); });
    await page.getByRole('button', { name: 'Leave and recover later', exact: true }).click();
    await switching; await settle(); expect(store.account()?.guid).toBe(accountB.guid); expect(nativeDiscard).not.toHaveBeenCalled();
    await TestBed.inject(WorkspaceNavigationService).openWorkspace(account.guid); await settle();
    await router.navigateByUrl(`/v1/workspace/account/account-a/home/dashboard/${board.guid}`); await settle();
    expect(editor.session()?.proposal?.operationGuid).toBe(operation);
    await click('Refresh saved change'); expect(definition(board.guid).name).toBe('Already saved');
    expect(editor.session()?.proposal).toBeUndefined();
  });

  it.each(['first creation', 'last deletion'] as const)('keeps %s publication recovery reachable after account departure and return', async scenario => {
    if (scenario === 'last deletion') await create('Last dashboard');
    const commands = TestBed.inject(HomeCommands), submit = vi.spyOn(commands, 'submit'), execute = vi.spyOn(TestBed.inject(HomeCommandHandler), 'execute');
    if (scenario === 'first creation') {
      await click('Create dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('First dashboard');
    } else await click('Delete dashboard');
    const reload = vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    await click(scenario === 'first creation' ? 'Save dashboard' : 'Delete dashboard'); reload.mockRestore();
    const operation = TestBed.inject(HomeEditor).session()!.proposal!.operationGuid;
    const departing = TestBed.inject(WorkspaceNavigationService).openWorkspace(accountB.guid);
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('[role=dialog]')).not.toBeNull(); });
    await page.getByRole('button', { name: 'Leave and recover later', exact: true }).click(); await departing; await settle();
    await TestBed.inject(WorkspaceNavigationService).openWorkspace(account.guid); await settle();
    const editor = TestBed.inject(HomeEditor), key = editor.pendingPublications()[0]?.key;
    expect(key).toBeDefined(); expect(root.textContent).toContain('Saved Home changes need refresh');
    if (scenario === 'first creation') { await click('Edit dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('Unsaved follow-up'); }
    store.selectFacility(store.facilities()[0]); const selectedFacility = store.selectedFacility()?.guid, url = router.url, writes = execute.mock.calls.length, submissions = submit.mock.calls.length;
    const recover = vi.spyOn(commands, 'recover');
    await click('Refresh saved Home change');
    expect(recover).toHaveBeenCalledWith(account.guid, operation); expect(execute).toHaveBeenCalledTimes(writes); expect(submit).toHaveBeenCalledTimes(submissions);
    expect(router.url).toBe(url); expect(store.selectedFacility()?.guid).toBe(selectedFacility);
    expect(store.committedRevision()?.accountGuid).toBe(account.guid); expect(editor.pendingPublications()).toEqual([]);
    if (scenario === 'first creation') {
      expect(editor.session()?.definition?.name).toBe('Unsaved follow-up');
      expect((root.querySelector('#home-name') as HTMLInputElement).value).toBe('Unsaved follow-up');
      expect(editor.needsProtection()).toBe(true);
    }
    expect(store.homeDashboards()).toHaveLength(scenario === 'first creation' ? 1 : 0);
    expect(await harness.getAll('homeDashboards')).toHaveLength(scenario === 'first creation' ? 1 : 0);
  });

  it('adopts an imported nonempty set explicitly without creating starter dashboards or charts', async () => {
    const imported = { ...getNewIdbHomeDashboard(account.guid, { kind: 'account', guid: account.guid }, { ...homeDefinition(), name: 'Imported board' }), id: 1 };
    await harness.seed({ homeDashboards: [imported] }); await workspace.reloadActiveWorkspace(false);
    await router.navigateByUrl(`/v1/workspace/account/account-a/home/dashboard/${imported.guid}`); await settle();
    expect(await harness.getAll('homeOwners')).toEqual([]);
    await click('Enable editing for imported dashboards');
    expect(store.homeDashboards()).toHaveLength(1); expect(store.homeDashboards()[0].definition).toEqual(imported.definition);
    expect(store.savedVisualizations()).toEqual([]); expect(store.homeOwners()).toHaveLength(1);
    await click('Edit dashboard'); expect((root.querySelector('#home-name') as HTMLInputElement).value).toBe('Imported board');
  });

  it('retains rejected writes, reviews native conflicts and recovers committed publication without replay', async () => {
    const board = await create('Recovery board');
    await click('Edit dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('Retained draft');
    const handler = TestBed.inject(HomeCommandHandler), execute = vi.spyOn(handler, 'execute').mockRejectedValueOnce(new Error('Simulated rejected write'));
    await click('Save dashboard'); expect(root.textContent).toContain('The dashboard change could not be saved'); expect(definition(board.guid).name).toBe('Recovery board');
    const operation = TestBed.inject(HomeEditor).session()!.proposal!.operationGuid;
    await click('Retry save'); expect(definition(board.guid).name).toBe('Retained draft');
    expect(execute.mock.calls[0][0].operationGuid).toBe(operation); expect(execute.mock.calls[1][0].operationGuid).toBe(operation);
    await click('Edit dashboard'); await page.getByLabelText('Dashboard name', { exact: true }).fill('Local conflict');
    const saved = store.homeDashboards().find(record => record.guid === board.guid)!;
    await firstValueFrom(harness.dbService.update('homeDashboards', { ...saved, revision: saved.revision + 1, definition: { ...definition(board.guid), name: 'Concurrent change' } }));
    await click('Save dashboard'); expect(root.textContent).toContain('draft is retained');
    await click('Load saved state for review'); expect(root.textContent).toContain('Concurrent change');
    await click('Keep draft against reviewed version');
    const publication = vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication failed'));
    await click('Save dashboard'); expect(root.textContent).toContain('Refresh saved change');
    const calls = execute.mock.calls.length;
    publication.mockRestore(); await click('Refresh saved change');
    expect(execute).toHaveBeenCalledTimes(calls); expect(definition(board.guid).name).toBe('Local conflict');
    expect(root.textContent).toContain('Saved change refreshed');
    expect(document.activeElement).toBe(root.querySelector('#home-title'));
    expect(await harness.getAll('homeDashboards')).toHaveLength(1);
    expect(TestBed.inject(HomeCommands).ownerView({ kind: 'account', guid: account.guid }).records).toHaveLength(1);
  });
});
