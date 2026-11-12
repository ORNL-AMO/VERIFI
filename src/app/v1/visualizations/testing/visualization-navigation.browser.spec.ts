import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import type { VisualizationCommand, VisualizationCommandOutcome } from '@data/account-workspace/visualization-commands.models';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { LibraryComponent } from '../library/library.component';
import { LibraryModule } from '../library/library.module';
import { VISUALIZATION_ROUTES } from '../visualizations.routes';
import { WorkbenchComponent } from '../workbench/workbench.component';
import { WorkbenchModule } from '../workbench/workbench.module';
import { visualizationRecord, visualizationSnapshot } from './visualization-test-fixtures';
import { group, meter, reading } from '@app/v1/data/meters/facility-meters.testing';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: `
  <main class="v1-root" style="height:600px;overflow:auto"><router-outlet/></main>
  <div class="v1-root" data-testid="shell-modal-outlet"><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>` })
class NavigationHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: '<h1>Outside visualizations</h1>' })
class OutsidePage { }

const base = '/v1/workspace/account/account-a/visualization';
const workbenchA = `${base}/workbench/visualization-a`;
const workbenchB = `${base}/workbench/visualization-b`;

function setup(options: { singleFacility?: boolean } = {}) {
  const store = new AccountWorkspaceStore();
  const initial = visualizationSnapshot();
  const snapshot = { ...initial, account: { ...initial.account, ...(options.singleFacility ? { isSingleFacilityCompany: true } : {}) } };
  const second = { ...visualizationRecord(), id: 2, guid: 'visualization-b',
    definition: { ...visualizationRecord().definition as any, name: 'Other energy' } };
  const foreign = { ...visualizationRecord(), id: 3, guid: 'foreign-visualization', accountId: 'account-b',
    definition: { ...visualizationRecord().definition as any, accountGuid: 'account-b', name: 'Private Account B chart' } };
  store.publish({ ...snapshot, savedVisualizations: [...snapshot.savedVisualizations, second, foreign] });
  const currentUrl = signal('/');
  let router!: Router;
  const routeState = computed(() => parseWorkspaceRoute(currentUrl()));
  const navigation = {
    routeState, isSingleSiteWorkspace: computed(() => store.account()?.isSingleFacilityCompany === true && store.facilities().length === 1),
    inventoryFacilityGuid: computed(() => router?.parseUrl(currentUrl()).queryParamMap.get('facility') ?? undefined),
    changeFacilityScope: vi.fn(async scope => router.navigateByUrl(`${base}/dashboard${scope.kind === 'facility' ? `?facility=${scope.facilityGuid}` : ''}`))
  };
  let nextGuid = 0;
  const prepareCreate = vi.fn<SavedVisualizationCommands['prepareCreate']>(definition => ({ kind: 'create',
    accountGuid: definition.accountGuid, guid: `created-${++nextGuid}`, definition: structuredClone(definition),
    createdDate: '2026-11-11T00:00:00.000Z' }));
  const submit = vi.fn(async (command: VisualizationCommand): Promise<VisualizationCommandOutcome> => {
    if (command.kind === 'create') {
      const date = new Date(command.createdDate);
      const value = getNewIdbSavedVisualization(command.definition, { guid: command.guid, createdDate: date, modifiedDate: date });
      store.publishCommitted({ ...store.snapshot()!, savedVisualizations: [...store.savedVisualizations(), value] }, store.selections());
      return { state: 'committed', command, value, referenceIssues: [] };
    }
    const saved = store.savedVisualizations().find(item => item.guid === command.guid)!;
    if (command.kind !== 'update') throw new Error('This navigation fixture only permits creation and metadata updates.');
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
    { provide: SavedVisualizationCommands, useValue: { prepareCreate, submit,
      recover: vi.fn(async (_accountGuid, guid) => { const record = store.savedVisualizations().find(item => item.guid === guid); return record ? readSavedVisualization(record) : undefined; }) } }
  ] });
  router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const routeSubscription = router.events.subscribe(event => { if (event instanceof NavigationEnd) currentUrl.set(event.urlAfterRedirects); });
  const fixture = TestBed.createComponent(NavigationHost); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const editor = () => fixture.debugElement.query(By.directive(WorkbenchComponent))?.componentInstance as WorkbenchComponent | undefined;
  const library = () => fixture.debugElement.query(By.directive(LibraryComponent))?.componentInstance as LibraryComponent | undefined;
  const navigate = async (url: string) => { const result = await router.navigateByUrl(url); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); return result; };
  const destroy = () => { fixture.destroy(); routeSubscription.unsubscribe(); };
  return { fixture, root, router, store, prepareCreate, submit, editor, library, navigate, destroy, modal: TestBed.inject(ModalPortalService) };
}

async function waitForDialog(test: ReturnType<typeof setup>) {
  await vi.waitFor(() => {
    test.fixture.detectChanges();
    expect(test.modal.activePortal()).toBeInstanceOf(TemplatePortal);
    expect(test.root.querySelector('[data-testid="shell-modal-outlet"] [role="dialog"]')).not.toBeNull();
  });
}

function dialogButton(root: HTMLElement, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll<HTMLButtonElement>('[data-testid="shell-modal-outlet"] [role="dialog"] button')].find(item => item.textContent!.trim() === text);
  if (!button) throw new Error(`Missing dialog button: ${text}`);
  return button;
}

function namedButton(root: HTMLElement, label: string): HTMLButtonElement {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
  const button = buttons.find(item => item.querySelector('strong')?.textContent?.trim() === label)
    ?? buttons.find(item => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
}

async function activate(test: ReturnType<typeof setup>, label: string): Promise<void> {
  const dialog = test.root.querySelector<HTMLElement>('app-workspace-slideout [role="dialog"]');
  const button = namedButton(dialog ?? test.root, label);
  expect(button.disabled).toBe(false); button.focus(); expect(document.activeElement).toBe(button);
  await userEvent.keyboard('{Enter}');
  test.fixture.detectChanges(); await test.fixture.whenStable(); test.fixture.detectChanges();
}

function creationDialog(test: ReturnType<typeof setup>): HTMLElement {
  const dialog = test.root.querySelector<HTMLElement>('app-workspace-slideout [role="dialog"]');
  if (!dialog) throw new Error('The Add visualization panel is not open.');
  return dialog;
}

describe('visualization routed journeys in Chromium', () => {
  it.each(['', '/dashboard', '/unknown'])('opens the Dashboard from the section path %s while retaining facility scope', async path => {
    const test = setup();
    try {
      await test.navigate(`${base}${path}?facility=facility-a`);
      expect(test.router.url).toBe(`${base}/dashboard?facility=facility-a`);
      expect(test.library()).toBeDefined();
      expect(test.library()!.scopedFacilityGuid()).toBe('facility-a');
      expect(test.library()!.entries().every(entry => entry.facilityGuid === 'facility-a')).toBe(true);
    } finally { test.destroy(); }
  });

  it.each([
    { label: 'Source', resource: 'Electricity', grouping: 'source' },
    { label: 'Meter group', resource: 'Production', grouping: 'group' },
    { label: 'Meters', resource: 'Main meter', grouping: 'meter' }
  ])('creates and reopens an energy trend using $label cards with keyboard selection', async choice => {
    await page.viewport(480, 760);
    const test = setup();
    try {
      test.store.publish({ ...test.store.snapshot()!, meters: [meter({ groupId: 'group-a', name: 'Main meter' })],
        meterGroups: [group({ guid: 'group-a', name: 'Production' })], meterData: [reading({})] });
      await test.navigate(`${base}/dashboard`); await activate(test, 'Add visualization'); await activate(test, 'Portfolio');
      await activate(test, 'Energy usage trend');
      const grouping = creationDialog(test).querySelector('[aria-label="View meters by"]')!;
      expect([...grouping.querySelectorAll('strong')].map(item => item.textContent)).toEqual(['Source', 'Meter group', 'Meters']);
      expect([...grouping.querySelectorAll('button')].every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
      await activate(test, choice.label);
      const dialog = creationDialog(test), resource = namedButton(dialog, choice.resource);
      expect(dialog.querySelector('select')).toBeNull(); expect(resource.getAttribute('aria-pressed')).toBe('false');
      expect(namedButton(dialog, 'Continue').disabled).toBe(true);
      const marker = resource.querySelector<HTMLElement>('.creation-choice__selection')!.getBoundingClientRect(), card = resource.getBoundingClientRect();
      expect(marker.left).toBeGreaterThan(card.left); expect(marker.right).toBeLessThan(card.left + card.width / 2);
      expect(marker.top).toBeGreaterThan(card.top); expect(marker.bottom).toBeLessThan(card.top + card.height / 2);
      await activate(test, choice.resource); expect(resource.getAttribute('aria-pressed')).toBe('true');
      await page.screenshot({ element: dialog, path: `../../../../../.angular/vis3-alignment/energy-trend-${choice.grouping}-cards.png` });
      await activate(test, 'Continue'); await activate(test, 'Add visualization');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/workbench/created-1`); });
      const record = test.store.savedVisualizations().find(item => item.guid === 'created-1')!;
      expect(record.definition).toMatchObject({ sources: [{ kind: 'utility', groupBy: choice.grouping }] });
      await activate(test, 'Back to Dashboard'); await test.navigate(`${base}/workbench/created-1`);
      expect(test.editor()!.editor.definition()).toEqual(record.definition);
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });
  it('adds a mixed-sourceKind Scatter with the keyboard and reopens its full intent after restoring Dashboard filters', async () => {
    const test = setup();
    try {
      await test.navigate(`${base}/dashboard`);
      const search = test.root.querySelector<HTMLInputElement>('input[type="search"]')!;
      await userEvent.type(search, 'My energy'); test.fixture.detectChanges();
      await activate(test, 'Add visualization'); await activate(test, 'Portfolio');
      expect(creationDialog(test).querySelectorAll('[aria-label="Chart type"] .creation-choice')).toHaveLength(8);
      await activate(test, 'Scatter'); await activate(test, 'Meters'); await activate(test, 'Predictors');
      expect(namedButton(creationDialog(test), 'Meters').getAttribute('aria-pressed')).toBe('true');
      expect(namedButton(creationDialog(test), 'Predictors').getAttribute('aria-pressed')).toBe('true');
      expect(creationDialog(test).querySelector('input[formcontrolname="name"]')).toBeNull();
      await activate(test, 'Continue');
      const name = creationDialog(test).querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
      expect(document.activeElement).toBe(name);
      await userEvent.type(name, 'Weather and usage'); test.fixture.detectChanges();
      await activate(test, 'Add visualization');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/workbench/created-1`); });
      const saved = test.store.savedVisualizations().find(record => record.guid === 'created-1')!;
      const decoded = readSavedVisualization(saved);
      expect(decoded.state).toBe('setup-required');
      if (!('definition' in decoded)) throw new Error('Expected readable setup intent.');
      expect(decoded.definition).toMatchObject({ name: 'Weather and usage', scope: { kind: 'portfolio' }, chart: { kind: 'scatter', showFit: false },
        sources: [{ id: 'source-1', kind: 'utility' }, { id: 'source-2', kind: 'predictor' }], series: [] });
      expect(test.editor()?.editor.definition()).toEqual(decoded.definition);
      expect(test.root.textContent).toContain('Scatter'); expect(test.root.textContent).toContain('Predictors');
      await activate(test, 'Back to Dashboard');
      await vi.waitFor(() => {
        test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/dashboard`);
        expect(test.root.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('My energy');
      });
      expect(test.root.querySelector('[data-browse-id="created-1"]')).toBeNull();
      await userEvent.clear(test.root.querySelector<HTMLInputElement>('input[type="search"]')!); test.fixture.detectChanges();
      await test.fixture.whenStable(); test.fixture.detectChanges();
      const link = test.root.querySelector<HTMLAnchorElement>('a.portfolio-tile__name[data-browse-id="created-1"]')!;
      link.focus(); await userEvent.keyboard('{Enter}');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.editor()?.editor.definition()).toEqual(decoded.definition); });
      expect(test.prepareCreate).toHaveBeenCalledOnce(); expect(test.submit).toHaveBeenCalledOnce();
    } finally { test.destroy(); }
  });

  it('keeps an Add draft when a scope change is canceled and leaves only after explicit discard', async () => {
    const test = setup();
    try {
      await test.navigate(`${base}/dashboard`);
      await activate(test, 'Add visualization'); await activate(test, 'Portfolio');
      await activate(test, 'Scatter'); await activate(test, 'Meters');
      const departure = test.router.navigateByUrl(`${base}/dashboard?facility=facility-a`); await waitForDialog(test);
      dialogButton(test.root, 'Cancel').focus(); await userEvent.keyboard('{Enter}');
      await expect(departure).resolves.toBe(false); test.fixture.detectChanges();
      expect(test.router.url).toBe(`${base}/dashboard`);
      expect(namedButton(creationDialog(test), 'Meters').getAttribute('aria-pressed')).toBe('true');
      expect(test.library()!.lifecycle.needsProtection()).toBe(true); expect(test.submit).not.toHaveBeenCalled();
      const accepted = test.router.navigateByUrl('/outside'); await waitForDialog(test);
      dialogButton(test.root, 'Discard changes').focus(); await userEvent.keyboard('{Enter}');
      await expect(accepted).resolves.toBe(true); test.fixture.detectChanges();
      expect(test.router.url).toBe('/outside'); expect(test.submit).not.toHaveBeenCalled();
    } finally { test.destroy(); }
  });

  it('starts single-facility creation at chart selection and retains sole-facility ownership without creating analyses', async () => {
    const test = setup({ singleFacility: true });
    try {
      await test.navigate(`${base}/dashboard`); await activate(test, 'Add visualization');
      expect(creationDialog(test).querySelector('[aria-label="Visualization ownership"]')).toBeNull();
      expect(creationDialog(test).querySelectorAll('[aria-label="Chart type"] .creation-choice')).toHaveLength(8);
      await activate(test, 'Line'); await activate(test, 'Meters'); await activate(test, 'Continue');
      await userEvent.type(creationDialog(test).querySelector<HTMLInputElement>('input[formcontrolname="name"]')!, 'Plant usage');
      test.fixture.detectChanges(); await activate(test, 'Add visualization');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/workbench/created-1`); });
      expect(test.editor()?.editor.definition()?.scope).toEqual({ kind: 'facility', facilityGuid: 'facility-a' });
      expect(test.store.snapshot()!.facilityAnalyses).toEqual([]); expect(test.store.snapshot()!.accountAnalyses).toEqual([]);
      expect(test.prepareCreate).toHaveBeenCalledOnce(); expect(test.submit).toHaveBeenCalledOnce();
    } finally { test.destroy(); }
  });

  it('keeps chart and source selections readable and keyboard accessible in narrow and themed panels', async () => {
    await page.viewport(1280, 900);
    const test = setup();
    try {
      await test.navigate(`${base}/dashboard`); await activate(test, 'Add visualization'); await activate(test, 'Portfolio');
      const dialog = creationDialog(test);
      expect(dialog.querySelectorAll('[aria-label="Chart type"] .creation-choice')).toHaveLength(8);
      expect([...dialog.querySelectorAll('.creation-section-title')].map(heading => heading.textContent)).toEqual(['Pre-configured', 'Custom']);
      for (const heading of dialog.querySelectorAll<HTMLElement>('.creation-section-title')) {
        expect(getComputedStyle(heading).borderBottomWidth).toBe('0px');
        expect(getComputedStyle(heading).letterSpacing).toBe('normal');
      }
      expect(dialog.textContent).not.toContain('Choose saved meters next');
      expect(dialog.textContent).not.toContain('Choose a chart to configure');
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(namedButton(dialog, 'Energy usage trend'));
      expect(parseFloat(getComputedStyle(document.activeElement!).outlineWidth)).toBeGreaterThanOrEqual(2);
      await page.screenshot({ element: dialog, path: '../../../../../.angular/vis3-alignment/chart-choices-wide.png' });
      await activate(test, 'Scatter'); await activate(test, 'Meters'); await activate(test, 'Predictors');
      for (const width of [1280, 480]) {
        await page.viewport(width, 760);
        for (const palette of PORTFOLIO_PALETTES) {
          for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
            for (const surface of test.root.querySelectorAll<HTMLElement>('.v1-root')) surface.className = `v1-root v1-palette-${palette} ${mode}`;
            const panel = creationDialog(test), bounds = panel.getBoundingClientRect();
            expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(width);
            expect(panel.scrollWidth).toBeLessThanOrEqual(Math.ceil(bounds.width));
            const choice = namedButton(panel, 'Meters');
            expect(choice.getAttribute('aria-pressed')).toBe('true'); expect(textContrast(choice)).toBeGreaterThanOrEqual(4.5);
            const body = panel.querySelector<HTMLElement>('.v1-workspace-slideout__body')!;
            expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
            expect(namedButton(panel, 'Continue').getBoundingClientRect().bottom).toBeLessThanOrEqual(760);
          }
        }
      }
      await page.screenshot({ element: creationDialog(test), path: '../../../../../.angular/vis3-alignment/data-sources-narrow-dark-contrast.png' });
      await activate(test, 'Continue');
      expect(document.activeElement).toBe(creationDialog(test).querySelector('input[formcontrolname="name"]'));
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(namedButton(creationDialog(test), 'Cancel'));
      test.library()!.lifecycle.discard(); test.fixture.detectChanges();
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });

  it('opens a Dashboard card with Enter and restores its search and item focus on return', async () => {
    const test = setup(); await test.navigate(`${base}/dashboard`);
    const search = test.root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.focus(); await userEvent.type(search, 'My energy'); test.fixture.detectChanges();
    const link = test.root.querySelector<HTMLAnchorElement>('a.portfolio-tile__name[data-browse-id="visualization-a"]')!;
    link.focus(); await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(workbenchA); expect(test.editor()?.editor.definition()?.name).toBe('My energy'); });
    expect(test.root.textContent).not.toContain('Private Account B chart');
    const back = [...test.root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent!.trim() === 'Back to Dashboard')!;
    back.focus(); await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => {
      test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/dashboard`);
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
    const test = setup(); await test.navigate(`${base}/dashboard`); await test.navigate(workbenchA);
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
    await test.navigate(`${base}/dashboard`);
    expect(test.root.textContent).not.toContain('Private Account B chart'); expect(test.library()!.entries()).toHaveLength(2); test.destroy();
  });
});
