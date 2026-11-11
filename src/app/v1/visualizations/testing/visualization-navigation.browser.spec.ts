import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { userEvent } from 'vitest/browser';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import type { VisualizationCommand } from '@data/account-workspace/visualization-commands.models';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { LibraryComponent } from '../library/library.component';
import { LibraryModule } from '../library/library.module';
import { VISUALIZATION_ROUTES } from '../visualizations.routes';
import { WorkbenchComponent } from '../workbench/workbench.component';
import { WorkbenchModule } from '../workbench/workbench.module';
import { visualizationRecord, visualizationSnapshot } from './visualization-test-fixtures';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: `
  <main class="v1-root" style="height:600px;overflow:auto"><router-outlet/></main>
  <div class="v1-root" data-testid="shell-modal-outlet"><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>` })
class NavigationHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: '<h1>Outside visualizations</h1>' })
class OutsidePage { }

const base = '/v1/workspace/account/account-a/visualization';
const workbenchA = `${base}/workbench/visualization-a`;
const workbenchB = `${base}/workbench/visualization-b`;

function setup() {
  const store = new AccountWorkspaceStore();
  const snapshot = visualizationSnapshot();
  const second = { ...visualizationRecord(), id: 2, guid: 'visualization-b',
    definition: { ...visualizationRecord().definition as any, name: 'Other energy' } };
  const foreign = { ...visualizationRecord(), id: 3, guid: 'foreign-visualization', accountId: 'account-b',
    definition: { ...visualizationRecord().definition as any, accountGuid: 'account-b', name: 'Private Account B chart' } };
  store.publish({ ...snapshot, savedVisualizations: [...snapshot.savedVisualizations, second, foreign] });
  const currentUrl = signal('/');
  let router!: Router;
  const routeState = computed(() => parseWorkspaceRoute(currentUrl()));
  const navigation = {
    routeState, isSingleSiteWorkspace: computed(() => false),
    inventoryFacilityGuid: computed(() => router?.parseUrl(currentUrl()).queryParamMap.get('facility') ?? undefined),
    changeFacilityScope: vi.fn(async scope => router.navigateByUrl(`${base}/library${scope.kind === 'facility' ? `?facility=${scope.facilityGuid}` : ''}`))
  };
  const submit = vi.fn(async (command: VisualizationCommand) => {
    const saved = store.savedVisualizations().find(item => item.guid === command.guid)!;
    if (command.kind !== 'update') throw new Error('This navigation fixture only permits metadata updates.');
    const value = { ...saved, revision: saved.revision + 1, definition: command.definition };
    store.publishCommitted({ ...store.snapshot()!, savedVisualizations: store.savedVisualizations().map(item => item.guid === value.guid ? value : item) }, store.selections());
    return { state: 'committed', command, value, referenceIssues: [] };
  });
  TestBed.configureTestingModule({ imports: [NavigationHost, LibraryModule, WorkbenchModule], providers: [
    provideRouter([{ path: 'v1/workspace/account/:accountGuid/visualization', children: VISUALIZATION_ROUTES },
      { path: 'outside', component: OutsidePage }]),
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: AccountWorkspaceService, useValue: { selectAccount: vi.fn(async () => 'published') } },
    { provide: WorkspaceNavigationService, useValue: navigation },
    { provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
    { provide: SavedVisualizationCommands, useValue: { submit,
      recover: vi.fn(async (_accountGuid, guid) => { const record = store.savedVisualizations().find(item => item.guid === guid); return record ? readSavedVisualization(record) : undefined; }) } }
  ] });
  router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const routeSubscription = router.events.subscribe(event => { if (event instanceof NavigationEnd) currentUrl.set(event.urlAfterRedirects); });
  const fixture = TestBed.createComponent(NavigationHost); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const editor = () => fixture.debugElement.query(By.directive(WorkbenchComponent))?.componentInstance as WorkbenchComponent | undefined;
  const library = () => fixture.debugElement.query(By.directive(LibraryComponent))?.componentInstance as LibraryComponent | undefined;
  const navigate = async (url: string) => { const result = await router.navigateByUrl(url); fixture.detectChanges(); await fixture.whenStable(); return result; };
  const destroy = () => { fixture.destroy(); routeSubscription.unsubscribe(); };
  return { fixture, root, router, store, submit, editor, library, navigate, destroy, modal: TestBed.inject(ModalPortalService) };
}

async function waitForDialog(test: ReturnType<typeof setup>) {
  await vi.waitFor(() => {
    test.fixture.detectChanges();
    expect(test.modal.activePortal()).toBeInstanceOf(TemplatePortal);
    expect(test.root.querySelector('[data-testid="shell-modal-outlet"] [role="dialog"]')).not.toBeNull();
  });
}

function dialogButton(root: HTMLElement, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(item => item.textContent!.trim() === text);
  if (!button) throw new Error(`Missing dialog button: ${text}`);
  return button;
}

describe('visualization routed journeys in Chromium', () => {
  it('opens a library card with Enter and restores its search and item focus on return', async () => {
    const test = setup(); await test.navigate(`${base}/library`);
    const search = test.root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.focus(); await userEvent.type(search, 'My energy'); test.fixture.detectChanges();
    const link = test.root.querySelector<HTMLAnchorElement>('a.portfolio-tile__name[data-browse-id="visualization-a"]')!;
    link.focus(); await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(workbenchA); expect(test.editor()?.editor.definition()?.name).toBe('My energy'); });
    expect(test.root.textContent).not.toContain('Private Account B chart');
    const back = [...test.root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent!.trim() === 'Back to library')!;
    back.focus(); await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => {
      test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/library`);
      expect(test.root.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('My energy');
      expect((document.activeElement as HTMLElement).dataset['browseId']).toBe('visualization-a');
    });
    test.destroy();
  });

  it('retains invalid input and the current route when portal review is canceled, then leaves after explicit discard', async () => {
    const test = setup(); await test.navigate(workbenchA);
    const name = test.root.querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
    name.focus(); await userEvent.clear(name); test.fixture.detectChanges();
    expect(test.editor()!.editor.needsProtection()).toBe(true);
    const departure = test.router.navigateByUrl('/outside'); await waitForDialog(test);
    expect(test.router.url).toBe(workbenchA);
    const cancel = dialogButton(test.root, 'Cancel'); cancel.focus(); await userEvent.keyboard('{Enter}');
    await expect(departure).resolves.toBe(false); test.fixture.detectChanges();
    expect(test.router.url).toBe(workbenchA); expect(test.editor()!.editor.form.controls.name.value).toBe('');
    expect(test.editor()!.editor.needsProtection()).toBe(true); expect(test.submit).not.toHaveBeenCalled();
    const accepted = test.router.navigateByUrl('/outside'); await waitForDialog(test);
    const discard = dialogButton(test.root, 'Discard and leave'); discard.focus(); await userEvent.keyboard('{Enter}');
    await expect(accepted).resolves.toBe(true); test.fixture.detectChanges();
    expect(test.router.url).toBe('/outside'); expect(test.modal.activePortal()).toBeNull(); expect(test.submit).not.toHaveBeenCalled(); test.destroy();
  });

  it('guards same-config visualization identity changes before replacing the local draft', async () => {
    const test = setup(); await test.navigate(workbenchA);
    test.editor()!.editor.form.controls.name.setValue(''); test.fixture.detectChanges();
    const pending = test.router.navigateByUrl(workbenchB); await waitForDialog(test);
    expect(test.editor()!.editor.key()).toContain('visualization-a');
    dialogButton(test.root, 'Cancel').click(); await expect(pending).resolves.toBe(false); test.fixture.detectChanges();
    expect(test.router.url).toBe(workbenchA); expect(test.editor()!.editor.form.controls.name.value).toBe('');
    test.editor()!.editor.form.controls.name.setValue('My energy'); test.fixture.detectChanges();
    await expect(test.navigate(workbenchB)).resolves.toBe(true);
    expect(test.editor()!.editor.definition()?.name).toBe('Other energy'); expect(test.submit).not.toHaveBeenCalled(); test.destroy();
  });

  it('protects browser Back with the same shell portal and preserves invalid local input on Escape', async () => {
    const test = setup(); await test.navigate(`${base}/library`); await test.navigate(workbenchA);
    test.editor()!.editor.form.controls.name.setValue(''); test.fixture.detectChanges();
    TestBed.inject(Location).back(); await waitForDialog(test);
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => {
      test.fixture.detectChanges(); expect(test.modal.activePortal()).toBeNull();
      expect(test.router.url).toBe(workbenchA); expect(test.editor()!.editor.form.controls.name.value).toBe('');
    });
    test.editor()!.editor.discard(); test.destroy();
  });

  it('keeps missing and foreign saved deep links unavailable without exposing their payloads', async () => {
    const test = setup();
    for (const guid of ['missing-visualization', 'foreign-visualization']) {
      await test.navigate(`${base}/workbench/${guid}`);
      expect(test.editor()!.editor.definition()).toBeUndefined();
      expect(test.root.textContent).toContain('Visualization unavailable');
      expect(test.root.textContent).not.toContain('Private Account B chart');
      expect(test.root.querySelector('input[formcontrolname="name"]')).toBeNull();
      expect(test.editor()!.editor.needsProtection()).toBe(false);
    }
    await test.navigate(`${base}/library`);
    expect(test.root.textContent).not.toContain('Private Account B chart'); expect(test.library()!.entries()).toHaveLength(2); test.destroy();
  });
});
