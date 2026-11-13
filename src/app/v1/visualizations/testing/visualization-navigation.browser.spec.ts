import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { VisualizationReferenceIssue } from '@domain/visualizations/visualization-references';
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
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { FakeVisualizationSourceProvider, observed, visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import { VISUALIZATION_SOURCE_PROVIDERS, VISUALIZATION_PREVIEW_PRESENTERS, VISUALIZATION_DATE_CONTEXT_RESOLVER } from '../preview/preview-registry';
import { TimeSeriesPresenter } from '../time-series/time-series.presenter';
import { UtilitySourceEditorComponent } from '../utility/editors/source-editor/utility-source-editor.component';
import { echarts } from '@app/v1/shared/charts/echarts';
import { decisionNodeId, projectMeterItems } from '../decisions/decision-tree';
import { PeriodSettingsComponent } from '../utility/editors/period-settings/period-settings.component';
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

function setup(options: { singleFacility?: boolean; readyChart?: boolean } = {}) {
  const store = new AccountWorkspaceStore();
  const initial = { ...visualizationSnapshot(), meters: [meter({ id: 1, groupId: 'group-a' })], meterGroups: [group({ id: 1 })] };
  const readyDefinition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
  const evidence = visualizationEvidenceFixture(readyDefinition), resolution = evidence.resolution;
  const provider = new FakeVisualizationSourceProvider({ ...evidence,
    resolution: resolution.state === 'ready' && resolution.resolved.data.kind === 'time-series' ? { ...resolution,
      resolved: { ...resolution.resolved, data: { ...resolution.resolved.data,
        rows: [1, 2, 3, 4].map(month => ({ periodKey: `2025-0${month}-01`, start: `2025-0${month}-01`, end: `2025-0${month}-28`, values: { energy: observed(month * 10) } })) } } } : resolution });
  const resolve = vi.spyOn(provider, 'resolve');
  const snapshot = { ...initial, ...(options.readyChart ? { meters: [meter({ id: 1 })], savedVisualizations: [{ ...initial.savedVisualizations[0], definition: readyDefinition }] } : {}), account: { ...initial.account, ...(options.singleFacility ? { isSingleFacilityCompany: true } : {}) } };
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
    if (command.kind !== 'update' && command.kind !== 'retarget') throw new Error('Unsupported fixture command.');
    const decoded = readSavedVisualization(saved);
    if (!('definition' in decoded)) throw new Error('Fixture requires readable current intent.');
    const definition = command.kind === 'retarget' ? prepareVisualizationFacilityChange(decoded.definition, command.targetFacilities, store.snapshot()!, saved.preservation?.references).definition : command.definition;
    const { facilityId: _facilityId, ...current } = saved;
    const value = { ...current, revision: saved.revision + 1, definition };
    store.publishCommitted({ ...store.snapshot()!, savedVisualizations: store.savedVisualizations().map(item => item.guid === value.guid ? value : item) }, store.selections());
    return { state: 'committed', command, value, referenceIssues: [] };
  });
  TestBed.configureTestingModule({ imports: [NavigationHost, LibraryModule, WorkbenchModule], providers: [
    ...(options.readyChart ? [
      { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: [provider] },
      { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [new TimeSeriesPresenter()] },
      { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: async () => ({ calendarDate: '2026-11-11' }) } }
    ] : []),
    provideRouter([{ path: 'v1/workspace/account/:accountGuid/visualization', children: VISUALIZATION_ROUTES },
      { path: 'outside', component: OutsidePage }]),
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: AccountWorkspaceService, useValue: { selectAccount: vi.fn(async () => 'published') } },
    { provide: WorkspaceNavigationService, useValue: navigation },
    { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
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
  return { fixture, root, router, store, prepareCreate, submit, editor, library, navigate, destroy, resolve, modal: TestBed.inject(ModalPortalService) };
}

async function expandDecision(test: ReturnType<typeof setup>, id: string): Promise<void> {
  const toggle = test.root.querySelector<HTMLButtonElement>(`[id="${id}-heading"]`);
  if (toggle?.getAttribute('aria-expanded') === 'false') { toggle.click(); test.fixture.detectChanges(); await test.fixture.whenStable(); test.fixture.detectChanges(); }
}

async function bindMeterForCreation(test: ReturnType<typeof setup>, name = 'Meter A'): Promise<void> {
  await activate(test, 'Individual meters'); await activate(test, name);
  await activate(test, 'Continue'); await activate(test, 'Continue');
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

function breadcrumbLink(test: ReturnType<typeof setup>, label: string): HTMLAnchorElement {
  const link = [...test.root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Visualization breadcrumb"] a')].find(item => item.textContent?.trim() === label);
  if (!link) throw new Error(`Missing breadcrumb link: ${label}`);
  return link;
}

async function activateBreadcrumb(test: ReturnType<typeof setup>, label: string): Promise<void> {
  breadcrumbLink(test, label).focus(); await userEvent.keyboard('{Enter}');
  test.fixture.detectChanges(); await test.fixture.whenStable(); test.fixture.detectChanges();
}

function creationDialog(test: ReturnType<typeof setup>): HTMLElement {
  const dialog = test.root.querySelector<HTMLElement>('app-workspace-slideout [role="dialog"]');
  if (!dialog) throw new Error('The Add visualization panel is not open.');
  return dialog;
}

describe('visualization routed journeys in Chromium', () => {
  it('uses calendarization and combined item controls from a collapsed workbench', async () => {
    const test = setup();
    try {
      const original = utilityVisualizationFixture();
      const definition = { ...original, series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const }] };
      test.store.publish({ ...test.store.snapshot()!, meters: [meter({ guid: 'meter-a', name: 'Meter A' })],
        savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA);
      const editor = test.editor()!;
      expect(editor.expandedNodes().size).toBe(0);
      expect(test.root.querySelector('[id="observation:utility-heading"]')).toBeNull();
      await expandDecision(test, 'source:utility'); await expandDecision(test, 'data-settings:utility');
      const settings = test.root.querySelector<HTMLElement>('[id="data-settings:utility-body"]')!;
      const calendarized = [...settings.querySelectorAll<HTMLInputElement>('input[role="switch"]')]
        .find(input => input.closest('label')?.textContent?.trim() === 'Use Calendarized Data')!;
      expect(calendarized.checked).toBe(true);
      calendarized.focus(); await userEvent.keyboard(' '); test.fixture.detectChanges();
      expect(calendarized.checked).toBe(false);
      expect(editor.editor.definition()!.chart).toMatchObject({ interval: 'native' });
      await userEvent.keyboard(' '); test.fixture.detectChanges();
      expect(calendarized.checked).toBe(true);
      expect(editor.editor.definition()!.chart).toMatchObject({ interval: 'monthly' });
      const itemId = decisionNodeId({ kind: 'item', sourceId: 'utility', itemKey: 'resource:meter-a' });
      await expandDecision(test, itemId);
      const item = test.root.querySelector<HTMLElement>(`[id="${itemId}-body"]`)!;
      expect(item.querySelector('app-visualization-decision-section')).toBeNull();
      expect(test.root.querySelector('[id^="items:"]')).toBeNull();
      expect(test.root.querySelector('button[aria-label^="Move "]')).toBeNull();
      expect(item.querySelector('[aria-label="Meter A trace type"]')).not.toBeNull();
      const label = item.querySelector<HTMLInputElement>('input[formcontrolname="label"]')!;
      label.focus(); await userEvent.keyboard('Custom meter'); test.fixture.detectChanges();
      const bar = item.querySelector<HTMLButtonElement>('button[aria-label="Bar"]')!;
      bar.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(bar.getAttribute('aria-pressed')).toBe('true');
      const heading = test.root.querySelector<HTMLButtonElement>(`[id="${itemId}-heading"]`)!;
      heading.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(item.hidden).toBe(true);
      await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(item.hidden).toBe(false); expect(label.value).toBe('Custom meter');
      await editor.editor.flush(); test.fixture.detectChanges();
      expect(projectMeterItems(editor.editor.definition()!, 'utility', test.store.snapshot()!)[0].appearance)
        .toMatchObject({ label: 'Custom meter', traceType: 'bar' });
    } finally { test.destroy(); }
  });
  it('selects sibling source sections and changes facility grouping and energy settings with the keyboard', async () => {
    const test = setup();
    try {
      const original = utilityVisualizationFixture();
      const definition = { ...original,
        sources: original.sources.map(source => source.kind === 'utility' ? { ...source, selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: ['meter-a', 'meter-b'] } } : source),
        series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const }] };
      test.store.publish({ ...test.store.snapshot()!, meters: [meter({ guid: 'meter-a' }), meter({ guid: 'meter-b' })],
        savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA);
      expect([...test.root.querySelectorAll('#visualization-settings .decision-section__toggle')]
        .every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true);
      await expandDecision(test, 'sources');
      const editor = test.editor()!, settings = test.root.querySelector<HTMLElement>('#visualization-settings')!;
      const predictors = namedButton(settings.querySelector<HTMLElement>('[aria-label="Data source categories"]')!, 'Predictors');
      predictors.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(predictors.getAttribute('aria-pressed')).toBe('true');
      const predictor = editor.sourcePanels().find(source => source.kind === 'predictor')!;
      const predictorHost = test.root.querySelector(`[id="${predictor.nodeId}-heading"]`)!.closest('app-visualization-decision-section')!;
      expect(predictorHost.parentElement).toBe(settings);
      const sources = test.root.querySelector<HTMLButtonElement>('[id="sources-heading"]')!;
      sources.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(predictorHost.querySelector<HTMLElement>('.decision-section__body')!.hidden).toBe(false);
      await expandDecision(test, 'source:utility'); await expandDecision(test, 'data-settings:utility');
      const dataSettings = test.root.querySelector<HTMLElement>('[id="data-settings:utility-body"]')!;
      const aggregate = [...dataSettings.querySelectorAll<HTMLInputElement>('input[role="switch"]')]
        .find(input => input.closest('label')?.textContent?.includes('Aggregate by facility'))!;
      aggregate.focus(); await userEvent.keyboard(' '); test.fixture.detectChanges();
      expect(aggregate.checked).toBe(true);
      expect(projectMeterItems(editor.editor.definition()!, 'utility', test.store.snapshot()!).map(item => item.identity.resourceGuid)).toEqual(['facility-a']);
      const sourceEnergy = namedButton(dataSettings.querySelector<HTMLElement>('[aria-label="Site or source energy"]')!, 'Source');
      sourceEnergy.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(sourceEnergy.getAttribute('aria-pressed')).toBe('true');
      const meterSource = editor.editor.definition()!.sources.find(source => source.kind === 'utility')!;
      expect(meterSource.settings?.energyTreatment).toEqual({ kind: 'pinned', value: 'source' });
      const defaultUnits = dataSettings.querySelector<HTMLInputElement>('input[formcontrolname="useDefaultUnits"]')!;
      defaultUnits.focus(); await userEvent.keyboard(' '); test.fixture.detectChanges();
      expect(defaultUnits.checked).toBe(true);
      expect(dataSettings.querySelector('input[formcontrolname="unit"]')).toBeNull();
      await editor.editor.flush(); test.fixture.detectChanges();
      expect(test.store.savedVisualizations().find(record => record.guid === 'visualization-a')!.definition).toMatchObject({
        sources: [expect.objectContaining({ groupBy: 'facility', settings: { unit: { kind: 'owner' }, energyTreatment: { kind: 'pinned', value: 'source' } } }), expect.objectContaining({ kind: 'predictor' })]
      });
    } finally { test.destroy(); }
  });
  it('edits no-data items independently and confirms resets before changing the selected checkbox', async () => {
    const test = setup();
    try {
      const original = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
      const definition = { ...original,
        sources: original.sources.map(source => source.kind === 'utility' ? { ...source, selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: ['meter-a', 'meter-b'] } } : source),
        series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const }] };
      test.store.publish({ ...test.store.snapshot()!, meters: [meter({ guid: 'meter-a', name: 'Meter A' }), meter({ guid: 'meter-b', name: 'Meter B' })],
        savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA);
      const editor = test.editor()!;
      const open = (kind: Parameters<typeof decisionNodeId>[0]['kind'], itemKey?: string) => expandDecision(test, decisionNodeId({ kind, sourceId: 'utility', itemKey }));
      await open('source'); await open('item', 'resource:meter-a');
      const typeGroup = test.root.querySelector('[aria-label="Meter A trace type"]')!;
      const bar = typeGroup.querySelector<HTMLButtonElement>('[aria-label="Bar"]')!;
      bar.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(editor.chartSummary()).toBe('Combination');
      expect(projectMeterItems(editor.editor.definition()!, 'utility', test.store.snapshot()!).map(item => [item.available, item.appearance.traceType])).toEqual([[false, 'bar'], [false, 'line']]);
      await editor.editor.flush(); test.fixture.detectChanges();
      const before = test.submit.mock.calls.length;
      await open('resources');
      const picker = test.root.querySelector<HTMLElement>('app-visualization-resource-picker')!;
      const checkbox = [...picker.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')].find(button => button.textContent?.includes('Meter A'))!;
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      checkbox.click(); test.fixture.detectChanges(); await waitForDialog(test);
      expect(checkbox.getAttribute('aria-checked')).toBe('true'); expect(test.submit).toHaveBeenCalledTimes(before);
      dialogButton(test.root, 'Cancel').click(); test.fixture.detectChanges();
      expect(checkbox.getAttribute('aria-checked')).toBe('true'); expect(editor.chartSummary()).toBe('Combination');
      checkbox.click(); test.fixture.detectChanges(); await waitForDialog(test);
      dialogButton(test.root, 'Apply changes').click(); test.fixture.detectChanges(); await test.fixture.whenStable(); test.fixture.detectChanges();
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
      expect(projectMeterItems(editor.editor.definition()!, 'utility', test.store.snapshot()!).map(item => item.label)).toEqual(['Meter B']);
      await editor.editor.flush(); test.fixture.detectChanges();
      checkbox.click(); test.fixture.detectChanges(); await test.fixture.whenStable(); test.fixture.detectChanges();
      const restored = projectMeterItems(editor.editor.definition()!, 'utility', test.store.snapshot()!).find(item => item.label === 'Meter A')!;
      expect(restored.appearance.traceType).toBe('line'); expect(restored.customized).toBe(false);
      await editor.editor.flush(); test.fixture.detectChanges();
      const writes = test.submit.mock.calls.length;
      await open('resources'); await open('source'); await expandDecision(test, editor.rootNodes.chart);
      expect(test.submit).toHaveBeenCalledTimes(writes);
    } finally { test.destroy(); }
  });

  it('reviews excluded item removal before changing facility checkmarks and retains the saved identity', async () => {
    const test = setup();
    try {
      const original = utilityVisualizationFixture();
      const definition = { ...original, sources: original.sources.map(source => source.kind === 'utility' ? { ...source,
        selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: ['meter-a', 'meter-b'] } } : source),
        series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const,
          overrides: [{ resourceGuid: 'meter-a', accountGuid: 'account-a', color: '#123456' }] }] };
      const a = test.store.facilities()[0], b = { ...a, id: 2, guid: 'facility-b', name: 'Plant B' }, c = { ...a, id: 3, guid: 'facility-c', name: 'Plant C' };
      test.store.publish({ ...test.store.snapshot()!, facilities: [a, b, c], meters: [meter({ guid: 'meter-a' }), meter({ guid: 'meter-b', facilityId: b.guid })],
        savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA); const editor = test.editor()!;
      const saved = test.store.savedVisualizations()[0];
      await expandDecision(test, editor.rootNodes.facilities);
      const picker = test.root.querySelector('app-visualization-facility-picker')!;
      const row = (name: string) => picker.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
      row('Plant A').click(); test.fixture.detectChanges(); await waitForDialog(test);
      expect(row('Plant A').getAttribute('aria-checked')).toBe('true'); expect(editor.editor.definition()!.facilitySelection).toEqual({ kind: 'all' });
      dialogButton(test.root, 'Cancel').click(); test.fixture.detectChanges();
      expect(test.submit).not.toHaveBeenCalled(); expect(row('Plant A').getAttribute('aria-checked')).toBe('true');
      row('Plant A').click(); test.fixture.detectChanges(); await waitForDialog(test);
      dialogButton(test.root, 'Apply changes').click(); test.fixture.detectChanges();
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(row('Plant A').getAttribute('aria-checked')).toBe('false'); });
      expect(editor.editor.definition()!.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-b', 'facility-c'] });
      expect(editor.editor.definition()!.sources[0]).toMatchObject({ selection: { guids: ['meter-b'] } });
      expect(test.submit).toHaveBeenCalledOnce(); expect(test.submit.mock.calls[0][0].kind).toBe('retarget');
      const committed = test.store.savedVisualizations()[0];
      expect(committed).toMatchObject({ guid: saved.guid, id: saved.id, createdDate: saved.createdDate, revision: saved.revision + 1 });
      expect(committed.facilityId).toBeUndefined(); expect(test.router.url).toBe(workbenchA);
      row('Plant C').click(); test.fixture.detectChanges();
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(editor.scopeLabel()).toBe('Plant B'); });
      expect(row('Plant B').disabled).toBe(true);
    } finally { test.destroy(); }
  });

  it('serializes rapid sibling card clicks across an asynchronous facility save without dropping either choice', async () => {
    const test = setup(); let finish: (() => void) | undefined;
    try {
      const definition = utilityVisualizationFixture();
      const a = test.store.facilities()[0], b = { ...a, id: 2, guid: 'facility-b', name: 'Plant B' }, c = { ...a, id: 3, guid: 'facility-c', name: 'Plant C' };
      test.store.publish({ ...test.store.snapshot()!, facilities: [a, b, c], savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA); const workbench = test.editor()!;
      await expandDecision(test, workbench.rootNodes.facilities);
      const submit = test.submit.getMockImplementation()!, gate = new Promise<void>(resolve => finish = resolve);
      const savedRevision = workbench.editor.savedRevision();
      test.submit.mockImplementationOnce(async command => { await gate; return submit(command); });
      const row = (name: string) => test.root.querySelector<HTMLInputElement>(`app-visualization-facility-picker [aria-label="${name}"]`)!;
      await userEvent.click(row('Plant B').closest('label')!);
      await userEvent.click(row('Plant C').closest('label')!);
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.submit).toHaveBeenCalledOnce(); });
      expect(row('Plant C').disabled).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 550)); test.fixture.detectChanges();
      expect(test.submit).toHaveBeenCalledOnce();
      expect(test.submit.mock.calls[0][0]).toMatchObject({ kind: 'retarget', targetFacilities: { kind: 'fixed', facilityGuids: ['facility-a', 'facility-c'] } });
      finish!();
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(workbench.editor.definition()!.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] }); });
      expect(test.submit).toHaveBeenCalledTimes(2);
      expect(test.submit.mock.calls[1][0]).toMatchObject({ kind: 'retarget', expectedRevision: savedRevision + 1 });
      expect(workbench.editor.definition()!.sources).toEqual(definition.sources);
    } finally { finish?.(); test.destroy(); }
  });

  it('double-clicks a facility card into a reviewed sole selection without toggling away its presentation first', async () => {
    const test = setup();
    try {
      const original = utilityVisualizationFixture();
      const definition = { ...original, sources: original.sources.map(source => source.kind === 'utility' ? { ...source,
        selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: ['meter-a', 'meter-b'] } } : source),
        series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const,
          overrides: [{ resourceGuid: 'meter-a', accountGuid: 'account-a', color: '#123456' }] }] };
      const a = test.store.facilities()[0], b = { ...a, id: 2, guid: 'facility-b', name: 'Plant B' };
      test.store.publish({ ...test.store.snapshot()!, facilities: [a, b], meters: [meter({ guid: 'meter-a' }), meter({ guid: 'meter-b', facilityId: b.guid })],
        savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA); const workbench = test.editor()!;
      await expandDecision(test, workbench.rootNodes.facilities);
      const checkbox = test.root.querySelector<HTMLInputElement>('app-visualization-facility-picker [aria-label="Plant A"]')!;
      await userEvent.dblClick(checkbox.closest('label')!); await waitForDialog(test);
      expect(workbench.pendingDecision()!.action).toEqual({ kind: 'facilities', selection: { kind: 'fixed', facilityGuids: ['facility-a'] } });
      expect(checkbox.checked).toBe(true); expect(test.submit).not.toHaveBeenCalled();
      dialogButton(test.root, 'Cancel').click(); test.fixture.detectChanges();
      expect(workbench.editor.definition()!.facilitySelection).toEqual({ kind: 'all' });
      await userEvent.dblClick(checkbox.closest('label')!); await waitForDialog(test);
      dialogButton(test.root, 'Apply changes').click();
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(workbench.editor.definition()!.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] }); });
      expect(workbench.editor.definition()!.sources[0]).toMatchObject({ selection: { guids: ['meter-a'] } });
      expect(workbench.editor.definition()!.series[0].overrides).toEqual(definition.series[0].overrides);
      expect(test.submit).toHaveBeenCalledOnce();
    } finally { test.destroy(); }
  });

  it('keeps blocked imported meter intent when Facilities excludes colliding destination records', async () => {
    const test = setup();
    try {
      const original = utilityVisualizationFixture();
      const blocked = { ...original.series[0], id: 'blocked', traceType: 'bar' as const, label: 'Imported meter', overrides: [{ resourceGuid: 'meter-a', order: 3 }] };
      const definition = { ...original,
        sources: original.sources.map(source => source.kind === 'utility' ? { ...source, selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: ['meter-a', 'meter-b'] } } : source),
        series: [blocked, { ...original.series[0], id: 'verified', resourceGuid: 'meter-b' }] };
      const references: readonly VisualizationReferenceIssue[] = [
        { path: 'sources.0.selection.guids.0', kind: 'meter', guid: 'meter-a', reason: 'not-transferred' },
        { path: 'series.0.resourceGuid', kind: 'meter', guid: 'meter-a', reason: 'not-transferred' }
      ];
      const current = test.store.snapshot()!;
      const saved = { ...current.savedVisualizations[0], definition, preservation: { references, transfers: [] } };
      test.store.publish({ ...current, facilities: [...current.facilities, { ...current.facilities[0], guid: 'facility-b', name: 'Excluded plant' }],
        meters: [meter({ facilityId: 'facility-b' }), meter({ guid: 'meter-b', facilityId: 'facility-b' })], savedVisualizations: [saved] });
      await test.navigate(workbenchA); const workbench = test.editor()!;
      expect(workbench.editor.canEdit()).toBe(false); expect(workbench.editor.canRetarget()).toBe(true);
      await expandDecision(test, workbench.rootNodes.facilities);
      const excluded = test.root.querySelector<HTMLInputElement>('[aria-label="Excluded plant"]')!;
      excluded.focus(); await userEvent.keyboard(' '); await waitForDialog(test);
      expect(workbench.pendingDecision()?.result.definition.series).toEqual([blocked]); expect(test.submit).not.toHaveBeenCalled();
      dialogButton(test.root, 'Apply changes').focus(); await userEvent.keyboard('{Enter}');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.submit).toHaveBeenCalledOnce(); expect(workbench.pendingDecision()).toBeUndefined(); expect(workbench.editor.saving()).toBe(false); });
      expect(workbench.editor.definition()!.sources[0]).toMatchObject({ selection: { guids: ['meter-a'] } });
      expect(workbench.editor.definition()!.series).toEqual([blocked]); expect(workbench.editor.record()!.preservation!.references).toEqual(references);
    } finally { test.destroy(); }
  });

  it('repairs an imported missing facility through Facilities while ordinary chart edits remain disabled', async () => {
    const test = setup();
    try {
      const definition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a', 'missing'] });
      const saved = { ...test.store.savedVisualizations()[0], definition,
        preservation: { references: [{ kind: 'facility' as const, guid: 'missing', path: 'facilitySelection.facilityGuids.1', reason: 'not-transferred' as const }], transfers: [] } };
      test.store.publish({ ...test.store.snapshot()!, savedVisualizations: [saved] });
      test.submit.mockImplementationOnce(async command => {
        if (command.kind !== 'retarget') throw new Error('Facility repair must use the dedicated command.');
        const { preservation: _preservation, ...current } = saved;
        const value = { ...current, revision: saved.revision + 1, definition: command.reviewedDefinition };
        test.store.publishCommitted({ ...test.store.snapshot()!, savedVisualizations: [value] }, test.store.selections());
        return { state: 'committed', command, value, referenceIssues: [] };
      });
      await test.navigate(workbenchA); const workbench = test.editor()!;
      expect(workbench.editor.canEdit()).toBe(false); expect(workbench.editor.canRetarget()).toBe(true);
      await expandDecision(test, workbench.rootNodes.facilities);
      const missing = test.root.querySelector<HTMLInputElement>('[aria-label="Unavailable facility: missing"]')!;
      expect(missing.disabled).toBe(false); missing.focus(); await userEvent.keyboard(' ');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(workbench.editor.canEdit()).toBe(true); });
      expect(workbench.editor.definition()!.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] });
      expect(workbench.editor.record()!.guid).toBe(saved.guid); expect(test.submit).toHaveBeenCalledOnce();
    } finally { test.destroy(); }
  });

  it('includes future facilities and derives ownership without rewriting live All intent', async () => {
    const test = setup();
    try {
      const definition = utilityVisualizationFixture();
      test.store.publish({ ...test.store.snapshot()!, savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA); const editor = test.editor()!;
      await expandDecision(test, editor.rootNodes.facilities);
      expect(editor.scopeLabel()).toBe('Plant A');
      const revision = editor.editor.localRevision(), savedRevision = test.store.savedVisualizations()[0].revision;
      const a = test.store.facilities()[0], b = { ...a, id: 2, guid: 'facility-b', name: 'Plant B' };
      test.store.publishCommitted({ ...test.store.snapshot()!, facilities: [a, b], meters: [...test.store.meters(), meter({ guid: 'meter-b', facilityId: b.guid })] }, test.store.selections());
      test.fixture.detectChanges(); await test.fixture.whenStable(); test.fixture.detectChanges();
      expect(editor.scopeLabel()).toBe('Account A');
      expect(test.root.querySelector('[aria-label="Plant B"]')?.getAttribute('aria-checked')).toBe('true');
      const source = test.fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance as UtilitySourceEditorComponent;
      expect(source.choices().map(choice => choice.guid)).toContain('meter-b');
      expect(editor.editor.definition()).toEqual(definition); expect(editor.editor.localRevision()).toBe(revision);
      expect(test.store.savedVisualizations()[0].revision).toBe(savedRevision); expect(test.submit).not.toHaveBeenCalled();
    } finally { test.destroy(); }
  });

  it('keeps long facility lists searchable, scrollable and keyboard accessible in narrow themed settings', async () => {
    const test = setup();
    try {
      const a = test.store.facilities()[0];
      const facilities = Array.from({ length: 35 }, (_, index) => ({ ...a, id: index + 1, guid: index ? `facility-${index}` : a.guid,
        name: `Plant ${index} with a very long facility name for the manufacturing campus` }));
      test.store.publish({ ...test.store.snapshot()!, facilities, savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition: utilityVisualizationFixture() }] });
      await test.navigate(workbenchA); await expandDecision(test, test.editor()!.rootNodes.facilities);
      const picker = test.root.querySelector<HTMLElement>('app-visualization-facility-picker')!;
      const rows = picker.querySelector<HTMLElement>('.facility-picker__rows')!;
      expect(rows.scrollHeight).toBeGreaterThan(rows.clientHeight);
      const row = picker.querySelector<HTMLInputElement>(`[aria-label="${facilities[1].name}"]`)!;
      row.focus(); await userEvent.keyboard(' '); test.fixture.detectChanges();
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(row.getAttribute('aria-checked')).toBe('false'); });
      const search = picker.querySelector<HTMLInputElement>('input[type="search"]')!;
      await userEvent.type(search, 'Plant 34'); test.fixture.detectChanges();
      expect(rows.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
      expect(rows.querySelector(`[aria-label="${facilities[34].name}"]`)!.getAttribute('aria-checked')).toBe('true');
      expect(picker.querySelector('.facility-picker__count')!.textContent).toContain('34 selected');
      for (const width of [1280, 390]) {
        await page.viewport(width, 760);
        const surface = test.root.querySelector<HTMLElement>('.v1-root')!;
        for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
          surface.className = `v1-root ${mode}`;
          expect(picker.scrollWidth).toBeLessThanOrEqual(picker.clientWidth);
          expect(textContrast(rows.querySelector<HTMLElement>('.facility-picker__row')!)).toBeGreaterThanOrEqual(4.5);
        }
        await page.screenshot({ element: picker, path: `../../../../../.angular/vis3-alignment/facilities-checklist-${width}.png` });
      }
    } finally { test.destroy(); }
  });

  it('gives the ready chart more room without restarting providers or losing its zoom', async () => {
    await page.viewport(1280, 900);
    const test = setup({ readyChart: true });
    try {
      await test.navigate(workbenchA);
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.root.querySelector('canvas')).not.toBeNull(); });
      const canvas = test.root.querySelector<HTMLElement>('.time-series-canvas')!;
      const chart = echarts.getInstanceByDom(canvas)!;
      const initialWidth = chart.getWidth();
      expect(test.resolve).toHaveBeenCalledOnce();
      expect(test.root.querySelector('app-utility-source-editor')).not.toBeNull();
      expect(test.root.querySelector('app-visualization-resource-picker')).not.toBeNull();
      chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 }); test.fixture.detectChanges();
      const toggle = test.root.querySelector<HTMLButtonElement>('[aria-controls="visualization-settings"]')!;
      toggle.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      await vi.waitFor(() => expect(chart.getWidth()).toBeGreaterThan(initialWidth));
      expect(echarts.getInstanceByDom(canvas)).toBe(chart);
      expect((chart.getOption() as any).dataZoom[0]).toMatchObject({ start: 25, end: 75 });
      expect(test.resolve).toHaveBeenCalledOnce();
      const surface = test.root.querySelector<HTMLElement>('main.v1-root')!;
      await page.screenshot({ element: surface, path: '../../../../../.angular/vis3-alignment/ready-chart-settings-hidden.png' });
      await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      await vi.waitFor(() => expect(chart.getWidth()).toBe(initialWidth));
      expect(test.resolve).toHaveBeenCalledOnce();
      for (const width of [1280, 390]) {
        await page.viewport(width, 900);
        surface.classList.toggle('v1-theme-dark', width === 390);
        expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
        await page.screenshot({ element: surface, path: `../../../../../.angular/vis3-alignment/ready-workbench-${width}.png` });
      }
      expect(test.submit).not.toHaveBeenCalled();
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });
  it('scrolls settings independently and hides them without replacing drafts or the chart', async () => {
    await page.viewport(1280, 900);
    const test = setup();
    try {
      await test.navigate(workbenchA);
      for (const node of ['facilities', 'chart', 'period', 'appearance', 'source:source-1', 'data-settings:source-1']) await expandDecision(test, node);
      const root = test.root;
      const surface = root.querySelector<HTMLElement>('main.v1-root')!;
      const panel = root.querySelector<HTMLElement>('#visualization-settings')!;
      const chart = root.querySelector<HTMLElement>('.visualization-workbench__chart')!;
      const renderer = root.querySelector('app-visualization-preview');
      const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="visualization-settings"]')!;
      const layout = root.querySelector<HTMLElement>('.visualization-workbench__layout')!;
      const periods = test.fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
      expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
      const chartTop = chart.getBoundingClientRect().top;
      panel.scrollTop = 120;
      expect(panel.scrollTop).toBeGreaterThan(0);
      expect(chart.scrollTop).toBe(0); expect(surface.scrollTop).toBe(0);
      expect(chart.getBoundingClientRect().top).toBe(chartTop);
      const expandedWidth = chart.getBoundingClientRect().width;
      periods.form.controls.kind.setValue('fixed'); periods.form.controls.start.setValue('2026-03-01');
      test.fixture.detectChanges();
      const panelFocus = panel.querySelector<HTMLButtonElement>('button')!;
      panelFocus.focus({ preventScroll: true });
      toggle.click(); test.fixture.detectChanges();
      expect(panel.hidden).toBe(true); expect(document.activeElement).toBe(toggle);
      expect(panelFocus.getClientRects()).toHaveLength(0);
      expect(chart.getBoundingClientRect().width).toBeGreaterThan(expandedWidth);
      expect(root.querySelector('app-visualization-preview')).toBe(renderer);
      expect(test.editor()!.hasInvalidFields()).toBe(true);
      await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
      expect(panel.hidden).toBe(false);
      expect(test.fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance).toBe(periods);
      expect(periods.form.controls.start.value).toBe('2026-03-01');
      expect(panel.scrollTop).toBeGreaterThan(0);
      for (const width of [1280, 390]) {
        await page.viewport(width, 900);
        for (const palette of PORTFOLIO_PALETTES) {
          for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
            surface.className = `v1-root v1-palette-${palette} ${mode}`;
            expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
            expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
            expect(textContrast(toggle)).toBeGreaterThanOrEqual(4.5);
            if (width < 850) expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(layout.clientHeight / 2 + 1);
          }
        }
        await page.screenshot({ element: surface, path: `../../../../../.angular/vis3-alignment/cleaned-workbench-${width}.png` });
      }
      expect(test.submit).not.toHaveBeenCalled();
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });
  it('keeps recovery actions reachable when many source relationships are missing', async () => {
    await page.viewport(390, 900);
    const test = setup();
    try {
      const original = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
      const definition = { ...original, series: [], sources: original.sources.map(source => source.kind === 'utility'
        ? { ...source, selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: Array.from({ length: 24 }, (_, index) => `missing-meter-${index}`) } } : source) };
      test.store.publish({ ...test.store.snapshot()!, savedVisualizations: [{ ...test.store.savedVisualizations()[0], definition }] });
      await test.navigate(workbenchA);
      const recovery = test.root.querySelector<HTMLElement>('app-visualization-recovery-actions')!;
      const layout = test.root.querySelector<HTMLElement>('.visualization-workbench__layout')!;
      const reset = recovery.querySelector<HTMLButtonElement>('button')!;
      expect(reset).not.toBeNull(); expect(reset.disabled).toBe(false);
      expect(recovery.scrollHeight).toBeGreaterThan(recovery.clientHeight);
      expect(layout.getBoundingClientRect().height).toBeGreaterThan(50);
      reset.focus();
      expect(document.activeElement).toBe(reset); expect(recovery.scrollTop).toBeGreaterThan(0);
      expect(reset.getBoundingClientRect().bottom).toBeLessThanOrEqual(recovery.getBoundingClientRect().bottom + 1);
      expect(test.root.querySelector<HTMLElement>('main.v1-root')!.scrollTop).toBe(0);
      expect(test.submit).not.toHaveBeenCalled();
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });
  it('keeps save feedback in the header without shifting the workbench during autosave', async () => {
    const test = setup();
    try {
      await test.navigate(workbenchA);
      const session = test.editor()!.editor;
      const layout = test.root.querySelector<HTMLElement>('.visualization-workbench__layout')!;
      const indicator = test.root.querySelector<HTMLElement>('.visualization-workbench__save-state')!;
      const initialTop = layout.getBoundingClientRect().top, initialWidth = indicator.getBoundingClientRect().width;
      const submit = test.submit.getMockImplementation()!;
      let finish!: () => void;
      const gate = new Promise<void>(resolve => finish = resolve);
      test.submit.mockImplementationOnce(async command => { await gate; return submit(command); });
      session.form.controls.name.setValue('Edited chart'); test.fixture.detectChanges();
      expect(indicator.textContent?.trim()).toBe('Saving…');
      expect(test.root.querySelector('.visualization-workbench > .v1-alert')).toBeNull();
      expect(layout.getBoundingClientRect().top).toBe(initialTop);
      expect(indicator.getBoundingClientRect().width).toBe(initialWidth);
      const saved = session.flush(); test.fixture.detectChanges();
      expect(session.saving()).toBe(true);
      expect(indicator.textContent?.trim()).toBe('Saving…');
      expect(layout.getBoundingClientRect().top).toBe(initialTop);
      finish(); await expect(saved).resolves.toBe(true); test.fixture.detectChanges();
      expect(indicator.textContent?.trim()).toBe('Saved.');
      expect(layout.getBoundingClientRect().top).toBe(initialTop);
      expect(indicator.getBoundingClientRect().width).toBe(initialWidth);
    } finally { test.destroy(); }
  });
  it('keeps the workbench header and controls usable in wide and narrow windows', async () => {
    const test = setup();
    try {
      await test.navigate(workbenchA);
      const surface = test.root.querySelector<HTMLElement>('main.v1-root')!;
      const header = surface.querySelector<HTMLElement>('.v1-data-workbench-header')!;
      for (const [width, dark] of [[1280, false], [390, true]] as const) {
        await page.viewport(width, 900);
        surface.classList.toggle('v1-theme-dark', dark);
        surface.classList.toggle('v1-contrast-strong', dark);
        test.fixture.detectChanges();
        expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
        const toggle = surface.querySelector<HTMLButtonElement>('[aria-controls="visualization-workbench-facts"]')!;
        toggle.focus(); await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(surface.querySelector<HTMLElement>('#visualization-workbench-facts')!.hidden).toBe(false);
        expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
        await page.screenshot({ element: surface, path: `../../../../../.angular/vis3-alignment/workbench-${width}.png` });
        await userEvent.keyboard('{Enter}'); test.fixture.detectChanges();
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
      }
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });
  it('guards facility breadcrumb exits and opens account and facility dashboards independently of the entry context', async () => {
    const test = setup();
    try {
      await test.navigate(`${base}/dashboard?facility=facility-a`);
      await test.library()!.openRoute(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'workbench', 'visualization-a']);
      test.fixture.detectChanges();
      test.editor()!.editor.form.controls.name.setValue(''); test.fixture.detectChanges();
      breadcrumbLink(test, 'Plant A').click(); await waitForDialog(test);
      dialogButton(test.root, 'Cancel').click();
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.modal.activePortal()).toBeNull(); });
      expect(test.router.url).toBe(workbenchA);
      expect(test.editor()!.editor.form.controls.name.value).toBe('');
      test.editor()!.editor.form.controls.name.setValue('My energy'); test.fixture.detectChanges();
      await activateBreadcrumb(test, 'Plant A');
      expect(test.router.url).toBe(`${base}/dashboard?facility=facility-a`);
      expect(test.library()!.scopedFacilityGuid()).toBe('facility-a');
      await test.library()!.openRoute(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'workbench', 'visualization-a']);
      test.fixture.detectChanges();
      await activateBreadcrumb(test, 'Account A');
      expect(test.router.url).toBe(`${base}/dashboard`);
      expect(test.library()!.scopedFacilityGuid()).toBeUndefined();
    } finally { test.destroy(); }
  });
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
    { label: 'Individual meters', resource: 'Main meter', grouping: 'meter' }
  ])('creates and reopens an energy trend using $label cards with keyboard selection', async choice => {
    await page.viewport(480, 760);
    const test = setup();
    try {
      test.store.publish({ ...test.store.snapshot()!, meters: [meter({ groupId: 'group-a', name: 'Main meter' })],
        meterGroups: [group({ guid: 'group-a', name: 'Production' })], meterData: [reading({})] });
      await test.navigate(`${base}/dashboard`); await activate(test, 'Add visualization'); await activate(test, 'Continue');
      await activate(test, 'Energy usage trend');
      const grouping = creationDialog(test).querySelector('[aria-label="View meters by"]')!;
      expect([...grouping.querySelectorAll('strong')].map(item => item.textContent)).toEqual(['Source', 'Meter group', 'Individual meters']);
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
      await activate(test, 'Continue'); await activate(test, 'Continue'); await activate(test, 'Add visualization');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/workbench/created-1`); });
      const record = test.store.savedVisualizations().find(item => item.guid === 'created-1')!;
      expect(test.editor()!.expandedNodes().size).toBe(0);
      expect(record.definition).toMatchObject({ sources: [{ kind: 'utility', groupBy: choice.grouping }] });
      await activateBreadcrumb(test, 'Account A'); await test.navigate(`${base}/workbench/created-1`);
      expect(test.editor()!.editor.definition()).toEqual(record.definition);
    } finally { test.destroy(); await page.viewport(1280, 900); }
  });
  it('adds a mixed-sourceKind Scatter with the keyboard and reopens its full intent after restoring Dashboard filters', async () => {
    const test = setup();
    try {
      await test.navigate(`${base}/dashboard`);
      const search = test.root.querySelector<HTMLInputElement>('input[type="search"]')!;
      await userEvent.type(search, 'My energy'); test.fixture.detectChanges();
      await activate(test, 'Add visualization'); await activate(test, 'Continue');
      expect(creationDialog(test).querySelectorAll('[aria-label="Chart type"] .creation-choice')).toHaveLength(8);
      await activate(test, 'Scatter'); await activate(test, 'Meters'); await activate(test, 'Predictors');
      expect(namedButton(creationDialog(test), 'Meters').getAttribute('aria-pressed')).toBe('true');
      expect(namedButton(creationDialog(test), 'Predictors').getAttribute('aria-pressed')).toBe('true');
      expect(creationDialog(test).querySelector('input[formcontrolname="name"]')).toBeNull();
      await activate(test, 'Continue');
      await bindMeterForCreation(test);
      const name = creationDialog(test).querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
      expect(document.activeElement).toBe(name);
      await userEvent.type(name, 'Weather and usage'); test.fixture.detectChanges();
      await activate(test, 'Add visualization');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/workbench/created-1`); });
      const saved = test.store.savedVisualizations().find(record => record.guid === 'created-1')!;
      const decoded = readSavedVisualization(saved);
      expect(decoded.state).toBe('setup-required');
      if (!('definition' in decoded)) throw new Error('Expected readable setup intent.');
      expect(decoded.definition).toMatchObject({ name: 'Weather and usage', facilitySelection: { kind: 'all' }, chart: { kind: 'scatter', showFit: false },
        sources: [{ id: 'source-1', kind: 'utility', selectionMode: 'meter', selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a'] } }, { id: 'source-2', kind: 'predictor' }] });
      expect(test.editor()?.editor.definition()).toEqual(decoded.definition);
      expect(test.root.textContent).toContain('Scatter'); expect(test.root.textContent).toContain('Predictors');
      await activateBreadcrumb(test, 'Account A');
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
      await activate(test, 'Add visualization'); await activate(test, 'Continue');
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

  it('starts account creation at Facilities even for a single-facility account without creating analyses', async () => {
    const test = setup({ singleFacility: true });
    try {
      await test.navigate(`${base}/dashboard`); await activate(test, 'Add visualization');
      expect(creationDialog(test).querySelector('[aria-label="Included facilities"]')).not.toBeNull();
      await activate(test, 'Continue');
      expect(creationDialog(test).querySelectorAll('[aria-label="Chart type"] .creation-choice')).toHaveLength(8);
      await activate(test, 'Line'); await activate(test, 'Meters'); await activate(test, 'Continue');
      await bindMeterForCreation(test);
      await userEvent.type(creationDialog(test).querySelector<HTMLInputElement>('input[formcontrolname="name"]')!, 'Plant usage');
      test.fixture.detectChanges(); await activate(test, 'Add visualization');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${base}/workbench/created-1`); });
      expect(test.editor()?.editor.definition()?.facilitySelection).toEqual({ kind: 'all' });
      expect(test.store.snapshot()!.facilityAnalyses).toEqual([]); expect(test.store.snapshot()!.accountAnalyses).toEqual([]);
      expect(test.prepareCreate).toHaveBeenCalledOnce(); expect(test.submit).toHaveBeenCalledOnce();
    } finally { test.destroy(); }
  });

  it('starts facility-context creation at Chart and lets Back review the preselected facility cards', async () => {
    const test = setup();
    try {
      const a = test.store.facilities()[0], b = { ...a, id: 2, guid: 'facility-b', name: 'Plant B' };
      test.store.publish({ ...test.store.snapshot()!, facilities: [a, b] });
      await test.navigate(`${base}/dashboard?facility=facility-a`); await activate(test, 'Add visualization');
      expect(creationDialog(test).querySelector('[aria-label="Chart type"]')).not.toBeNull();
      expect(test.library()!.lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] });
      await activate(test, 'Back');
      const picker = creationDialog(test).querySelector('app-visualization-facility-picker')!;
      expect(picker.querySelector('[aria-label="Plant A"]')!.getAttribute('aria-checked')).toBe('true');
      expect(picker.querySelector('[aria-label="Plant B"]')!.getAttribute('aria-checked')).toBe('false');
      expect(picker.querySelector('.facility-picker__all')!.textContent).toContain('All Facilities');
      expect(test.submit).not.toHaveBeenCalled();
      test.library()!.lifecycle.discard(); test.fixture.detectChanges();
    } finally { test.destroy(); }
  });

  it('keeps chart and source selections readable and keyboard accessible in narrow and themed panels', async () => {
    await page.viewport(1280, 900);
    const test = setup();
    try {
      await test.navigate(`${base}/dashboard`); await activate(test, 'Add visualization'); await activate(test, 'Continue');
      const dialog = creationDialog(test);
      expect(dialog.querySelectorAll('[aria-label="Chart type"] .creation-choice')).toHaveLength(8);
      expect([...dialog.querySelectorAll('.creation-section-title')].map(heading => heading.textContent)).toEqual(['Pre-configured', 'Custom']);
      for (const heading of dialog.querySelectorAll<HTMLElement>('.creation-section-title')) {
        expect(getComputedStyle(heading).borderBottomWidth).toBe('0px');
        expect(getComputedStyle(heading).letterSpacing).toBe('normal');
      }
      expect(dialog.textContent).not.toContain('Choose saved meters next');
      expect(dialog.textContent).not.toContain('Choose a chart to configure');
      for (const label of ['Energy usage trend', 'Utility cost trend', 'Line']) {
        await userEvent.keyboard('{Tab}');
        expect(document.activeElement).toBe(namedButton(dialog, label));
        expect(parseFloat(getComputedStyle(document.activeElement!).outlineWidth)).toBeGreaterThanOrEqual(2);
      }
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
      expect(creationDialog(test).querySelector('[aria-label="View meters by"]')).not.toBeNull();
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
    const back = breadcrumbLink(test, 'Account A');
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
    await expandDecision(test, 'appearance');
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
