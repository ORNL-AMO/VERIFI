import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom, filter, Subscription, take, timeout } from 'rxjs';
import { vi } from 'vitest';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { getEmissions } from '@domain/calculations/emissions-calculations/emissions';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbAccessService } from '@data/indexedDB/indexed-db-access.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { UtilityMeterDatadbService } from '@data/indexedDB/utilityMeterData-db.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import type { UtilityVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { PreviewModule } from '../preview/preview.module';
import { PreviewComponent } from '../preview/preview/preview.component';
import { VISUALIZATION_DATE_CONTEXT_RESOLVER, VISUALIZATION_PREVIEW_PRESENTERS, VISUALIZATION_SOURCE_PROVIDERS } from '../preview/preview-registry';
import { TimeSeriesModule } from '../time-series/time-series.module';
import { TimeSeriesPresenter } from '../time-series/time-series.presenter';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { UtilityDateContextResolver } from '../utility/utility-date-context.service';
import { UtilitySourceProvider } from '../utility/utility-source-provider.service';

/** Real IndexedDB publication and a native calculation Worker feed the registered production presenter. */
describe('saved utility journey across native browser boundaries', () => {
  let harness: IndexedDbTestHarness | undefined;
  let fixtures: ComponentFixture<PreviewComponent>[];
  let subscriptions: Subscription[];
  let originalWorker: typeof Worker;
  let workerErrors: string[];
  const accountA = { ...getNewIdbAccount(), id: 1, guid: 'account-a', energyUnit: 'kWh', energyIsSource: false, fiscalYear: 'calendarYear' as const };
  const accountB = { ...getNewIdbAccount(), id: 2, guid: 'account-b', energyUnit: 'kWh', energyIsSource: false, fiscalYear: 'calendarYear' as const };
  const facilityA = { ...getNewIdbFacility(accountA), id: 1, guid: 'facility-a', energyUnit: 'kWh', energyIsSource: false, fiscalYear: 'calendarYear' as const, eGridSubregion: 'US' };
  const facilityB = { ...getNewIdbFacility(accountB), id: 2, guid: 'facility-b', energyUnit: 'kWh', energyIsSource: false, fiscalYear: 'calendarYear' as const, eGridSubregion: 'US' };

  beforeEach(async () => {
    fixtures = []; subscriptions = [];
    originalWorker = globalThis.Worker; workerErrors = [];
    globalThis.Worker = class extends originalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        // Angular's unit builder inlines the service into this test entry but serves
        // emitted Worker assets at the test-server root, not the source test folder.
        // Only correct that test asset base; the native Worker and calculation stay real.
        const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
        const resolved = /^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original;
        super(resolved, options);
        void fetch(resolved).then(response => { if (!response.ok) workerErrors.push(`Worker URL ${resolved} returned ${response.status}`); });
        this.addEventListener('error', event => workerErrors.push(`${event.message} at ${event.filename}:${event.lineno}`));
        this.addEventListener('message', event => { if (event.data?.error) workerErrors.push(event.data.message ?? 'Native Worker returned an error.'); });
      }
    };
    TestBed.configureTestingModule({ imports: [PreviewModule, TimeSeriesModule], providers: [
      UtilityDataSession, UtilitySourceProvider, UtilityDateContextResolver, TimeSeriesPresenter,
      { provide: VISUALIZATION_SOURCE_PROVIDERS, useExisting: UtilitySourceProvider, multi: true },
      { provide: VISUALIZATION_PREVIEW_PRESENTERS, useExisting: TimeSeriesPresenter, multi: true },
      { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useExisting: UtilityDateContextResolver },
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('utility-journey');
    await harness.seed({ accounts: [accountA, accountB], facilities: [facilityA, facilityB], utilityMeter: [
      { ...meter({ id: 1, meterReadingDataApplication: 'fullMonth' }) },
      { ...meter({ id: 2, guid: 'meter-b', accountId: accountB.guid, facilityId: facilityB.guid, meterReadingDataApplication: 'fullMonth' }) }
    ], utilityMeterData: [{ ...reading({ id: 1, totalEnergyUse: 10 }) }, { ...reading({ id: 2, guid: 'bill-b', accountId: accountB.guid, facilityId: facilityB.guid, meterId: 'meter-b', totalEnergyUse: 90 }) }] });
  });

  afterEach(async () => {
    fixtures.forEach(fixture => { if (!fixture.componentRef.hostView.destroyed) fixture.destroy(); });
    subscriptions.forEach(subscription => subscription.unsubscribe());
    vi.restoreAllMocks();
    globalThis.Worker = originalWorker;
    if (harness) await harness.destroy();
    harness = undefined;
  });

  function definition(accountGuid = accountA.guid): VisualizationDefinition {
    const original = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: [accountGuid === accountA.guid ? facilityA.guid : facilityB.guid] });
    const meterGuid = accountGuid === accountA.guid ? 'meter-a' : 'meter-b';
    const source = original.sources[0] as UtilityVisualizationSource;
    const { resourceGuid: _fixedResource, ...allMatching } = original.series[0];
    return { ...original, accountGuid, sources: [{ ...source, settings: { unit: { kind: 'pinned', value: 'kWh' }, energyTreatment: { kind: 'pinned', value: 'site' } },
      selection: { kind: 'fixed', resource: 'meter', guids: [meterGuid] } }],
      series: [{ ...allMatching, overrides: [{ resourceGuid: meterGuid, label: 'Factory main', color: '#23684d', visible: true }] }] };
  }

  async function createSaved(intent: VisualizationDefinition): Promise<IdbSavedVisualization> {
    const commands = TestBed.inject(SavedVisualizationCommands);
    const result = await commands.submit(commands.prepareCreate(intent));
    expect(result.state).toBe('committed');
    if (result.state !== 'committed' || !result.value) throw new Error('Expected real committed visualization creation.');
    expect(result.referenceIssues).toEqual([]);
    return result.value;
  }

  function decoded(record: IdbSavedVisualization): VisualizationDefinition {
    const result = readSavedVisualization(record);
    expect(result.state).toBe('valid');
    if (result.state !== 'valid') throw new Error('Expected a valid stored definition.');
    return result.definition;
  }

  function mount(record: IdbSavedVisualization): ComponentFixture<PreviewComponent> {
    const fixture = TestBed.createComponent(PreviewComponent);
    fixtures.push(fixture);
    const element = fixture.nativeElement as HTMLElement;
    element.className = 'v1-root'; element.style.width = '640px';
    render(fixture, record);
    return fixture;
  }

  function render(fixture: ComponentFixture<PreviewComponent>, record: IdbSavedVisualization): void {
    const workspace = TestBed.inject(AccountWorkspaceStore);
    fixture.componentRef.setInput('definition', decoded(record));
    fixture.componentRef.setInput('identity', { accountGuid: record.accountId, workspaceRevision: workspace.revision(), definitionGuid: record.guid, definitionRevision: record.revision });
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges(); TestBed.flushEffects();
  }

  async function expectValue(fixture: ComponentFixture<PreviewComponent>, value: number): Promise<void> {
    // Wait only for the native Worker and Angular publication; no timer-based completion assumption.
    await vi.waitFor(() => {
      TestBed.flushEffects(); fixture.detectChanges();
      const view = fixture.componentInstance.preview.state();
      expect(view.state, view.state === 'ready' ? undefined : `${view.state}: ${view.message} ${workerErrors.join('; ')}`).toBe('ready');
      if (view.state !== 'ready') return;
      const resolution = view.evidence[0].resolution;
      expect(resolution.state).toBe('ready');
      if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') return;
      const observation = Object.values(resolution.resolved.data.rows[0].values)[0];
      expect(observation.state).toBe('observed');
      if (observation.state === 'observed') expect(observation.value).toBeCloseTo(value, 10);
    }, { timeout: 10000 });
  }

  it('uses the loaded builtin grid catalog for native bills and real Worker monthly emissions', async () => {
    const grid = TestBed.inject(EGridService);
    // Exercise the production parser/catalog boundary with a nonzero deterministic grid fixture.
    grid.setCo2Emissions([
      { SUBRGN: 'US', Year: '2023', CATEGORY: 'LocationMix', CO2: '1000', CH4: '0.1', N2O: '0.01' },
      { SUBRGN: 'US', Year: '2023', CATEGORY: 'ResidualMix', CO2: '1200', CH4: '0.12', N2O: '0.012' }
    ]);
    await TestBed.inject(AccountWorkspaceService).selectAccount(accountA.guid);
    TestBed.flushEffects();
    const store = TestBed.inject(AccountWorkspaceStore), savedMeter = store.meters()[0];
    const expected = getEmissions(savedMeter, 10, savedMeter.energyUnit, 2026, false, [...store.facilities()], grid.co2Emissions,
      [], 0, savedMeter.vehicleCollectionUnit, savedMeter.vehicleDistanceUnit, 0, accountA.assessmentReportVersion, []).totalWithLocationEmissions;
    expect(expected).toBeGreaterThan(0);
    const base = definition(), original = base.sources[0] as UtilityVisualizationSource;
    const emissions = { ...original, measure: 'location-emissions' as const, settings: {} };
    const series = [{ ...base.series[0], metric: 'location-emissions' }];
    const workerMessages = vi.spyOn(Worker.prototype, 'postMessage');
    const native = await createSaved({ ...base, sources: [{ ...emissions, dataMode: 'billing-period', aggregation: 'none' }], series,
      chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'native', stack: 'none' } });
    const nativePreview = mount(native); await expectValue(nativePreview, expected);
    expect(workerMessages).not.toHaveBeenCalled(); nativePreview.destroy();
    const monthly = await createSaved({ ...base, sources: [emissions], series });
    await expectValue(mount(monthly), expected);
    expect(workerMessages).toHaveBeenCalledTimes(1);
  });

  it('creates, previews, saves display edits, reopens and refreshes from real saved readings', async () => {
    const workerMessages = vi.spyOn(Worker.prototype, 'postMessage');
    const workspace = TestBed.inject(AccountWorkspaceService), store = TestBed.inject(AccountWorkspaceStore);
    await workspace.selectAccount(accountA.guid);
    // Retain the shared canonical consumer while previews change, as the workspace status consumer does.
    subscriptions.push(TestBed.inject(WorkspaceCalendarizationService).calendarizeBase().subscribe());
    const saved = await createSaved(definition());
    const first = mount(saved);
    await expectValue(first, 10);
    expect(workerMessages).toHaveBeenCalled();
    await vi.waitFor(() => expect((first.nativeElement as HTMLElement).querySelector('canvas')).not.toBeNull());
    expect((first.nativeElement as HTMLElement).querySelector('tbody')?.textContent).toContain('Factory main');
    const workerCount = workerMessages.mock.calls.length;

    const beforeEdit = decoded(saved);
    const edited: VisualizationDefinition = { ...beforeEdit, appearance: { ...beforeEdit.appearance, title: 'Saved source energy' },
      sources: beforeEdit.sources.map(source => source.kind === 'utility' ? { ...source, settings: { ...source.settings, unit: { kind: 'pinned', value: 'MWh' } } } : source),
      chart: { kind: 'time-series', defaultTraceType: 'bar', interval: 'monthly', stack: 'none' } };
    // Local presentation/unit edits reproject existing canonical results before any durable workspace reload.
    render(first, { ...saved, definition: edited });
    await expectValue(first, 0.01);
    expect(workerMessages.mock.calls.length).toBe(workerCount);
    const outcome = await TestBed.inject(SavedVisualizationCommands).submit({ kind: 'update', accountGuid: saved.accountId, guid: saved.guid, expectedRevision: saved.revision, definition: edited });
    expect(outcome.state).toBe('committed');
    first.destroy();
    await workspace.reloadActiveWorkspace();
    const reopened = store.savedVisualizations().find(record => record.guid === saved.guid)!;
    const second = mount(reopened);
    await expectValue(second, 0.01);
    expect(decoded(reopened)).toMatchObject({ version: 2, chart: { type: 'bar' }, series: [{ overrides: [{ resourceGuid: 'meter-a', visible: true, label: 'Factory main' }] }] });
    const beforeReadingWorkerCount = workerMessages.mock.calls.length;

    const bill = store.meterData().find(item => item.guid === 'reading-a')!;
    await TestBed.inject(WorkspaceCommandBoundary).execute({ entityKind: 'meterData', entityGuid: bill.guid, changeKind: 'update', label: 'Updating saved utility reading' },
      () => firstValueFrom(TestBed.inject(UtilityMeterDatadbService).updateWithObservable({ ...bill, totalEnergyUse: 25 })));
    render(second, store.savedVisualizations().find(record => record.guid === saved.guid)!);
    await expectValue(second, 0.025);
    expect(workerMessages.mock.calls.length).toBeGreaterThan(beforeReadingWorkerCount);
    const beforeClose = structuredClone(store.savedVisualizations().find(record => record.guid === saved.guid)!);
    second.destroy(); subscriptions.forEach(subscription => subscription.unsubscribe()); subscriptions = [];
    await harness!.reopen();
    const repository = new SavedVisualizationsDbService(harness!.dbService, new IndexedDbAccessService(harness!.dbService));
    const durable = await repository.getStoredByGuid(saved.guid);
    expect(durable).toEqual(beforeClose);
    expect(decoded(durable!)).toEqual(edited);
    expect((await firstValueFrom(harness!.dbService.getByKey<any>('utilityMeterData', bill.id)))?.totalEnergyUse).toBe(25);
    expect(Object.keys(durable!.definition as object)).not.toContain('data');
    expect(Object.keys(durable!.definition as object)).not.toContain('options');
  });

  it('cancels obsolete native calculations and never publishes the departed account into a new preview', async () => {
    const workspace = TestBed.inject(AccountWorkspaceService), calendarization = TestBed.inject(WorkspaceCalendarizationService);
    await workspace.selectAccount(accountA.guid);
    const savedA = await createSaved(definition());
    const acquire = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const fixture = mount(savedA);
    expect(acquire).toHaveBeenCalled();
    const obsoleteSignal = acquire.mock.calls[0][1];
    fixture.componentRef.setInput('active', false); fixture.detectChanges();
    expect(obsoleteSignal.aborted).toBe(true);
    const readyA = firstValueFrom(calendarization.calendarizeBase().pipe(filter(result => result.state === 'ready'), take(1), timeout(10000)));
    TestBed.flushEffects(); await readyA;
    fixture.detectChanges();
    expect(fixture.componentInstance.preview.state().state).toBe('inactive');

    await workspace.selectAccount(accountB.guid);
    const savedB = await createSaved(definition(accountB.guid));
    render(fixture, savedB);
    await expectValue(fixture, 90);
    const view = fixture.componentInstance.preview.state();
    if (view.state !== 'ready') throw new Error('Expected account B preview.');
    expect(view.definition.accountGuid).toBe(accountB.guid);
    expect(view.evidence.every(entry => entry.resolution.identity.accountGuid === accountB.guid)).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('0.01 MWh');
  });
});
