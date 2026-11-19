import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { HomeDashboardDefinition, HomeOwner, HomeOwnerState, HomeWidget } from '@domain/home/home-dashboard';
import { homeAccountOwner, homeDefinition } from '@domain/home/testing/home-fixtures';
import { storageBlueprints } from '@data/home/testing/home-command-fixtures';
import { readHomeDashboard, readHomeOwner, readHomeWidget } from '@data/home/home-record';
import { HomeCommands } from '../home-commands.service';
import { AccountWorkspaceService } from '../account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { AccountWorkspaceLoaderService } from '../account-workspace-loader.service';
import { WorkspaceCommandBoundary } from '../workspace-command-boundary.service';
import { SavedVisualizationCommands } from '../saved-visualization-commands.service';
import { HomeCommandHandler } from './home-command-handler.service';
import { HomeCommand } from '../home-commands.models';

describe('Home atomic native commands and workspace publication', () => {
  let harness: IndexedDbTestHarness, commands: HomeCommands, store: AccountWorkspaceStore, workspace: AccountWorkspaceService;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('home-commands');
    await harness.seed({ accounts: [account], facilities: [facility] });
    store = TestBed.inject(AccountWorkspaceStore); workspace = TestBed.inject(AccountWorkspaceService); commands = TestBed.inject(HomeCommands);
    await workspace.selectAccount(account.guid);
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });
  const definition = (record: Readonly<IdbHomeDashboard>) => (readHomeDashboard(record) as { state: 'valid'; value: HomeDashboardDefinition }).value;
  const ownerState = (record: Readonly<IdbHomeOwner>) => (readHomeOwner(record) as { state: 'valid'; value: HomeOwnerState }).value;
  async function initialize(owner: HomeOwner = homeAccountOwner) {
    const result = await commands.submit(commands.prepareInitialize(owner, storageBlueprints(owner)));
    expect(result.state).toBe('committed');
    return commands.ownerView(owner);
  }
  function current(guid: string) { return store.homeDashboards().find(record => record.guid === guid)!; }

  it('initializes once, shares starter charts, hydrates after restart and publishes one complete graph', async () => {
    const committed = vi.fn(); TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    const view = await initialize();
    expect(store.homeDashboards()).toHaveLength(6); expect(store.savedVisualizations()).toHaveLength(1);
    expect(store.savedVisualizations()[0].homeOrigin).toMatchObject({ owner: homeAccountOwner, templates: ['home', 'goal-progress'] });
    expect(committed).toHaveBeenCalledTimes(1);
    const before = store.snapshot();
    const again = await commands.submit(commands.prepareInitialize(homeAccountOwner, storageBlueprints()));
    expect(again.state).toBe('unchanged'); expect(store.snapshot()).toBe(before); expect(committed).toHaveBeenCalledTimes(1);
    await harness.reopen();
    const snapshot = await TestBed.inject(AccountWorkspaceLoaderService).load(account.guid);
    expect(snapshot.homeDashboards).toEqual(before!.homeDashboards); expect(snapshot.homeOwners).toEqual(before!.homeOwners);
    expect(ownerState(snapshot.homeOwners[0]).defaultDashboardGuid).toBe(view.defaultDashboardGuid);
    expect(snapshot.savedVisualizations).toEqual(before!.savedVisualizations);
  });
  it('serializes concurrent initialization at the native boundary without duplicate graphs', async () => {
    const handler = TestBed.inject(HomeCommandHandler);
    const first = commands.prepareInitialize(homeAccountOwner, storageBlueprints()), second = commands.prepareInitialize(homeAccountOwner, storageBlueprints());
    const outcomes = await Promise.all([handler.execute(first, account.guid), handler.execute(second, account.guid)]);
    expect(outcomes.map(value => value.changed).sort()).toEqual([false, true]);
    expect(await harness.getAll('homeDashboards')).toHaveLength(6); expect(await harness.getAll('homeOwners')).toHaveLength(1);
    expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
  });
  it('hydrates an already committed concurrent initialization without reseeding or publishing another user change', async () => {
    const proposal = commands.prepareInitialize(homeAccountOwner, storageBlueprints());
    await TestBed.inject(HomeCommandHandler).execute(proposal, account.guid); // A second window committed first.
    expect(store.homeDashboards()).toEqual([]);
    const staleEntry = commands.prepareInitialize(homeAccountOwner, storageBlueprints());
    vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Conditional hydration unavailable'));
    expect((await commands.submit(staleEntry)).state).toBe('failed');
    expect((await commands.submit(staleEntry)).state).toBe('unchanged');
    expect(store.homeDashboards()).toHaveLength(6); expect(store.savedVisualizations()).toHaveLength(1);
    expect(store.committedRevision()).toBeUndefined();
    expect(await harness.getAll('homeDashboards')).toHaveLength(6);
  });
  it('creates fresh template definitions independently of existing charts, retries the same graph and creates Blank without charts', async () => {
    await initialize();
    const firstChart = store.savedVisualizations()[0], proposal = commands.prepareCreate(homeAccountOwner, storageBlueprints()[0]);
    expect((await commands.submit(proposal)).state).toBe('committed');
    expect(store.savedVisualizations()).toHaveLength(2); expect(store.savedVisualizations()).toContainEqual(firstChart);
    const created = store.homeDashboards().find(record => record.creationOperationGuid === proposal.operationGuid)!;
    expect(created.template).toMatchObject({ automatic: false, customized: false });
    expect((await commands.submit(proposal)).state).toBe('unchanged'); expect(store.savedVisualizations()).toHaveLength(2);
    if (proposal.kind !== 'create') throw new Error('Expected creation');
    const changedIntent: HomeCommand = { ...proposal, graph: { ...proposal.graph, charts: proposal.graph.charts.map(chart => ({ ...chart, definition: { ...chart.definition, name: 'Different intent' } })) } };
    expect((await commands.submit(changedIntent)).state).toBe('conflict');
    expect((await commands.submit(commands.prepareCreate(homeAccountOwner, { template: 'blank', version: 1, dashboard: homeDefinition(), charts: [] }))).state).toBe('committed');
    expect(store.savedVisualizations()).toHaveLength(2); expect(store.homeDashboards()).toHaveLength(8);
  });
  it('rolls back owner/layout/chart writes together and retries the retained graph identities', async () => {
    const proposal = commands.prepareInitialize(homeAccountOwner, storageBlueprints());
    const original = IndexedDbTransactionContext.prototype.add;
    let dashboards = 0;
    const fail = vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function(store, record) {
      if (store === 'homeDashboards' && ++dashboards === 2) throw new Error('forced graph rollback');
      return original.call(this, store, record);
    });
    expect((await commands.submit(proposal)).state).toBe('failed');
    for (const name of ['homeDashboards', 'homeOwners', 'savedVisualizations']) expect(await harness.getAll(name)).toEqual([]);
    expect(store.committedRevision()).toBeUndefined();
    fail.mockRestore(); expect((await commands.submit(proposal)).state).toBe('committed');
    expect(store.homeDashboards().map(record => record.guid)).toEqual(proposal.kind === 'initialize' ? proposal.graph.dashboards.map(item => item.guid) : []);
  });
  it('recovers committed publication without replaying initialization, duplication or restore', async () => {
    const initializeProposal = commands.prepareInitialize(homeAccountOwner, storageBlueprints());
    const persist = vi.spyOn(TestBed.inject(HomeCommandHandler), 'execute');
    const proposals: (() => HomeCommand)[] = [() => initializeProposal,
      () => commands.prepareDuplicate(store.homeDashboards()[0]),
      () => commands.prepareTemplateReplacement(store.homeDashboards()[0], storageBlueprints()[0])];
    for (const prepare of proposals) {
      const proposal = prepare(), calls = persist.mock.calls.length;
      vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('publication unavailable'));
      expect((await commands.submit(proposal)).state).toBe('refresh-required');
      const durable = await harness.getAll('homeDashboards'), charts = await harness.getAll('savedVisualizations');
      expect((await commands.submit(proposal)).state).toBe('refresh-required'); expect(persist).toHaveBeenCalledTimes(calls + 1);
      await commands.recover(account.guid, proposal.operationGuid);
      expect((await commands.submit(proposal)).state).toBe('committed'); expect(persist).toHaveBeenCalledTimes(calls + 1);
      expect(await harness.getAll('homeDashboards')).toEqual(durable); expect(await harness.getAll('savedVisualizations')).toEqual(charts);
      expect(store.homeDashboards()).toEqual(durable);
    }
  });
  it('duplicates independent layout/settings/widget identities while retaining links and never deletes charts with widgets', async () => {
    const view = await initialize(), original = view.records[0];
    expect((await commands.submit(commands.prepareDuplicate(original))).state).toBe('committed');
    const duplicate = store.homeDashboards().find(record => record.guid !== original.guid && record.template?.customized)!;
    expect(definition(duplicate).widgets[0]).toMatchObject({ visualizationGuid: (definition(original).widgets[0] as any).visualizationGuid });
    expect(definition(duplicate).widgets[0].id).not.toBe(definition(original).widgets[0].id);
    const changed = { ...definition(duplicate), defaults: { emissionsTreatment: 'location' as const }, widgets: [] };
    expect((await commands.submit(commands.prepareUpdate(duplicate, changed))).state).toBe('committed');
    expect(definition(current(original.guid))).toEqual(definition(original)); expect(store.savedVisualizations()).toHaveLength(1);
    expect((await commands.submit(commands.prepareDelete(current(duplicate.guid)))).state).toBe('committed');
    expect(store.savedVisualizations()).toHaveLength(1);
  });
  it('keeps deletions/defaults durable, resolves invalid defaults predictably and never reseeds an initialized empty owner', async () => {
    const view = await initialize(), home = view.records[0], costs = view.records.find(record => record.template?.template === 'costs')!;
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...commands.ownerView(homeAccountOwner).state!, defaultDashboardGuid: costs.guid }))).state).toBe('committed');
    expect((await commands.submit(commands.prepareDelete(current(costs.guid)))).state).toBe('committed');
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(home.guid);
    for (const record of [...store.homeDashboards()]) expect((await commands.submit(commands.prepareDelete(current(record.guid)))).state).toBe('committed');
    const state = commands.ownerView(homeAccountOwner).state!;
    expect(state.initialized).toBe(true); expect(state.dashboardOrder).toEqual([]); expect(state.deletedStarters).toHaveLength(6);
    expect((await commands.submit(commands.prepareInitialize(homeAccountOwner, storageBlueprints()))).state).toBe('unchanged');
    expect(store.homeDashboards()).toEqual([]); expect(store.savedVisualizations()).toHaveLength(1);
    await harness.reopen();
    const snapshot = await TestBed.inject(AccountWorkspaceLoaderService).load(account.guid);
    expect(snapshot.homeDashboards).toEqual([]); expect(ownerState(snapshot.homeOwners[0])).toEqual(state);
  });
  it('rejects revision conflicts and cross-account links without replacing retained proposals', async () => {
    const { records } = await initialize(), home = records[0];
    const first = commands.prepareUpdate(home, { ...definition(home), name: 'First edit' });
    const stale = commands.prepareUpdate(home, { ...definition(home), name: 'Retained second edit' });
    expect((await commands.submit(first)).state).toBe('committed');
    const result = await commands.submit(stale); expect(result).toMatchObject({ state: 'conflict', command: stale });
    expect(definition(current(home.guid)).name).toBe('First edit');
    const configure = commands.prepareConfigure(homeAccountOwner, commands.ownerView(homeAccountOwner).state!);
    expect((await commands.submit({ ...configure, expectedOwnerRevision: 0 })).state).toBe('conflict');
    await harness.seed({ savedVisualizations: [{ ...store.savedVisualizations()[0], id: 20, guid: 'foreign-chart', accountId: 'foreign-account' }] });
    const original = current(home.guid), widget = definition(original).widgets[0] as any;
    expect((await commands.submit(commands.prepareUpdate(original, { ...definition(original), widgets: [{ ...widget, visualizationGuid: 'foreign-chart' }] }))).state).toBe('failed');
    expect(definition(current(home.guid)).widgets).toEqual(definition(original).widgets);
  });
  it('restores identity/order/defaults with fresh charts while preserving every former shared chart', async () => {
    const { records } = await initialize(), home = records[0], sibling = records[1], oldChart = store.savedVisualizations()[0];
    const state = commands.ownerView(homeAccountOwner).state!, before = definition(sibling);
    await commands.submit(commands.prepareUpdate(home, { ...definition(home), name: 'Customized', defaults: { emissionsTreatment: 'location' } }));
    const restore = commands.prepareTemplateReplacement(current(home.guid), storageBlueprints()[0]);
    expect((await commands.submit(restore)).state).toBe('committed');
    const restored = current(home.guid);
    expect(restored.id).toBe(home.id); expect(restored.createdDate).toEqual(home.createdDate); expect(restored.template?.customized).toBe(false);
    expect(definition(restored)).toMatchObject({ name: 'home', defaults: {} }); expect(definition(restored).widgets[0]).not.toMatchObject({ visualizationGuid: oldChart.guid });
    expect(store.savedVisualizations()).toHaveLength(2); expect(store.savedVisualizations()).toContainEqual(oldChart);
    expect(definition(current(sibling.guid))).toEqual(before); expect(commands.ownerView(homeAccountOwner).state).toEqual(state);
  });
  it('hydrates an external conflicting edit without replaying a rejected write and accepts a newly reviewed revision', async () => {
    const { records } = await initialize(), home = records[0];
    const retained = commands.prepareUpdate(home, { ...definition(home), name: 'Retained edit' });
    await TestBed.inject(HomeCommandHandler).execute(commands.prepareUpdate(home, { ...definition(home), name: 'Other window' }), account.guid);
    const committed = vi.fn(); TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    expect((await commands.submit(retained)).state).toBe('conflict'); expect(definition(current(home.guid)).name).toBe('home');
    await commands.recover(account.guid, retained.operationGuid);
    expect(definition(current(home.guid)).name).toBe('Other window'); expect(store.committedRevision()).toBeUndefined();
    expect(committed).not.toHaveBeenCalled();
    const retry = await commands.submit(commands.prepareUpdate(current(home.guid), { ...definition(current(home.guid)), name: 'Retained edit' }));
    expect(retry.state).toBe('committed');
  });
  it('rejects stale chart-deletion dependencies even when the chart revision is unchanged', async () => {
    const { records } = await initialize(), chart = store.savedVisualizations()[0], visualizations = TestBed.inject(SavedVisualizationCommands);
    const reviewed = visualizations.prepareDelete(chart);
    await commands.submit(commands.prepareUpdate(records[0], { ...definition(records[0]), widgets: [] }));
    expect((await visualizations.submit(reviewed)).state).toBe('conflict');
    expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
    await visualizations.recover(account.guid, chart.guid);
    expect(visualizations.dependencies(chart.guid).widgets).toHaveLength(1);
    expect((await visualizations.submit(visualizations.prepareDelete(store.savedVisualizations()[0]))).state).toBe('committed');
    expect(visualizations.dependencies(chart.guid).widgets).toHaveLength(1);
    expect(await harness.getAll('savedVisualizations')).toEqual([]);
  });

  it.each([true, false])('preserves transferred unavailable owner intent across lifecycle writes (initialized: %s)', async initialized => {
    const { records, record } = await initialize(), costs = records.find(item => item.template?.template === 'costs')!;
    const { transferHomeOwner } = await import('@data/backup/home-backup');
    const source = { ...record!, state: { ...ownerState(record!), initialized, dashboardOrder: ['missing-order', ...ownerState(record!).dashboardOrder], defaultDashboardGuid: 'missing-default' } };
    const transferred = transferHomeOwner(source, account.guid, { dashboard: Object.fromEntries(records.map(item => [item.guid, item.guid])) }, record!.guid, records);
    await firstValueFrom(harness.dbService.update('homeOwners', { ...transferred, id: record!.id })); await workspace.reloadActiveWorkspace(false);
    const assertIntent = () => {
      const saved = store.homeOwners()[0];
      expect(ownerState(saved).defaultDashboardGuid).toBe('missing-default'); expect(ownerState(saved).dashboardOrder[0]).toBe('missing-order');
      expect(saved.preservation?.references).toEqual(transferred.preservation?.references);
      expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(records[0].guid);
    };
    if (!initialized) { expect((await commands.submit(commands.prepareInitialize(homeAccountOwner, storageBlueprints()))).state).toBe('committed'); assertIntent(); }
    expect((await commands.submit(commands.prepareCreate(homeAccountOwner, { template: 'blank', version: 1, dashboard: homeDefinition(), charts: [] }))).state).toBe('committed'); assertIntent();
    expect((await commands.submit(commands.prepareDuplicate(current(records[0].guid)))).state).toBe('committed'); assertIntent();
    expect((await commands.submit(commands.prepareUpdate(current(costs.guid), { ...definition(current(costs.guid)), name: 'Edited', visibility: 'hidden' }))).state).toBe('committed'); assertIntent();
    expect((await commands.submit(commands.prepareDelete(current(costs.guid)))).state).toBe('committed'); assertIntent();
    expect(ownerState(store.homeOwners()[0]).dashboardOrder).not.toContain(costs.guid);
    await harness.reopen();
    const restored = await TestBed.inject(AccountWorkspaceLoaderService).load(account.guid);
    expect(ownerState(restored.homeOwners[0]).defaultDashboardGuid).toBe('missing-default');
    expect(ownerState(restored.homeOwners[0]).dashboardOrder[0]).toBe('missing-order');
  });
  it('keeps a coincident shortcut unavailable until reviewed owner and resource bindings agree', async () => {
    const { records } = await initialize(), home = records[0];
    const other = { ...facility, id: 2, guid: 'facility-b' };
    const meter = { ...getNewIdbUtilityMeter(other.guid, account.guid, true, 'kWh'), guid: 'meter-a' };
    await harness.seed({ facilities: [other], utilityMeter: [meter] });
    const imported: IdbHomeDashboard = { ...home, definition: homeDefinition([{ id: 'shortcut', kind: 'shortcut', size: 'full', visibility: 'always',
      destination: { area: 'data', owner: { kind: 'facility', guid: facility.guid }, resource: { kind: 'meter', guid: meter.guid } } }]), preservation: {
      references: [{ path: 'widgets.shortcut.destination.owner.guid', kind: 'facility', guid: facility.guid, reason: 'not-transferred' },
        { path: 'widgets.shortcut.destination.resource.guid', kind: 'meter', guid: meter.guid, reason: 'not-transferred' }], transfers: [] } };
    await firstValueFrom(harness.dbService.update('homeDashboards', imported)); await workspace.reloadActiveWorkspace(false);
    // Ordinary layout edits may retain protected unavailable intent.
    expect((await commands.submit(commands.prepareUpdate(current(home.guid), { ...definition(imported), name: 'Kept layout' }))).state).toBe('committed');
    const retained = current(home.guid), paths = retained.preservation!.references.map(ref => ref.path);
    expect((await commands.submit(commands.prepareUpdate(retained, definition(retained), paths))).state).toBe('failed');
    expect(current(home.guid)).toEqual(retained); expect(readHomeWidget(current(home.guid), 'shortcut').state).toBe('repair-required');
    const valid = { ...definition(retained), widgets: [{ ...definition(retained).widgets[0], kind: 'shortcut' as const,
      destination: { area: 'data' as const, owner: { kind: 'facility' as const, guid: other.guid }, resource: { kind: 'meter' as const, guid: meter.guid } } }] };
    expect((await commands.submit(commands.prepareUpdate(retained, valid, paths))).state).toBe('committed');
    expect(readHomeWidget(current(home.guid), 'shortcut').state).toBe('valid');
  });
  it.each([true, false])('retains unavailable saved order/default through unrelated lifecycle commands (initialized: %s)', async initialized => {
    const { records, record } = await initialize(), home = records[0], costs = records.find(item => item.template?.template === 'costs')!;
    const imported = { ...record!, state: { ...ownerState(record!), initialized,
      dashboardOrder: ['unavailable-order', ...ownerState(record!).dashboardOrder], defaultDashboardGuid: 'unavailable-default' } };
    await firstValueFrom(harness.dbService.update('homeOwners', imported)); await workspace.reloadActiveWorkspace(false);
    const assertIntent = () => {
      expect(commands.ownerView(homeAccountOwner).state?.defaultDashboardGuid).toBe('unavailable-default');
      expect(commands.ownerView(homeAccountOwner).state?.dashboardOrder[0]).toBe('unavailable-order');
      expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(home.guid);
    };
    if (!initialized) { await commands.submit(commands.prepareInitialize(homeAccountOwner, storageBlueprints())); assertIntent(); }
    expect((await commands.submit(commands.prepareCreate(homeAccountOwner, { template: 'blank', version: 1, dashboard: homeDefinition(), charts: [] }))).state).toBe('committed'); assertIntent();
    expect((await commands.submit(commands.prepareDuplicate(current(home.guid)))).state).toBe('committed'); assertIntent();
    expect((await commands.submit(commands.prepareUpdate(current(costs.guid), { ...definition(current(costs.guid)), visibility: 'hidden' }))).state).toBe('committed'); assertIntent();
    expect((await commands.submit(commands.prepareDelete(current(costs.guid)))).state).toBe('committed'); assertIntent();
  });
  it('uses a fallback for a blocked coincident default until explicit owner configuration acknowledges it', async () => {
    const { records, record } = await initialize(), costs = records.find(item => item.template?.template === 'costs')!;
    const owner = { ...record!, state: { ...ownerState(record!), defaultDashboardGuid: costs.guid }, preservation: {
      references: [{ path: 'defaultDashboardGuid', kind: 'dashboard' as const, guid: costs.guid, reason: 'not-transferred' as const }], transfers: [] } };
    await firstValueFrom(harness.dbService.update('homeOwners', owner));
    await workspace.reloadActiveWorkspace(false);
    const view = commands.ownerView(homeAccountOwner);
    expect(view.state?.defaultDashboardGuid).toBe(costs.guid); expect(view.defaultDashboardGuid).toBe(records[0].guid);
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, view.state!))).state).toBe('unchanged');
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(records[0].guid);
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, view.state!, ['defaultDashboardGuid']))).state).toBe('committed');
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(costs.guid);
    expect(store.homeOwners()[0].preservation?.references).toEqual([]);
    const revision = store.homeOwners()[0].revision;
    await commands.submit(commands.prepareUpdate(current(costs.guid), { ...definition(current(costs.guid)), visibility: 'hidden' }));
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(records[0].guid);
    expect(commands.ownerView(homeAccountOwner).state?.defaultDashboardGuid).toBe(costs.guid); expect(store.homeOwners()[0].revision).toBe(revision);
    await commands.submit(commands.prepareDelete(current(costs.guid)));
    expect(commands.ownerView(homeAccountOwner).state?.defaultDashboardGuid).toBe(records[0].guid);
  });
  it.each(['hidden', 'missing'] as const)('reorders dashboards while retaining a %s default and unavailable order entries', async kind => {
    const { records } = await initialize(), water = records.find(item => item.template?.template === 'water')!;
    await harness.seed({ utilityMeter: [{ guid: 'water-meter', accountId: account.guid, facilityId: facility.guid, source: 'Water Intake' }] });
    await workspace.reloadActiveWorkspace(false);
    await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...commands.ownerView(homeAccountOwner).state!, defaultDashboardGuid: water.guid }));
    const meter = (await harness.getAll('utilityMeter'))[0]; await firstValueFrom(harness.dbService.delete('utilityMeter', meter.id!));
    const owner = store.homeOwners()[0], selected = kind === 'hidden' ? water.guid : 'missing-default';
    const references = [{ path: 'dashboardOrder.missing-order', kind: 'dashboard' as const, guid: 'missing-order', reason: 'not-transferred' as const },
      ...(kind === 'missing' ? [{ path: 'defaultDashboardGuid', kind: 'dashboard' as const, guid: selected, reason: 'not-transferred' as const }] : [])];
    await firstValueFrom(harness.dbService.update('homeOwners', { ...owner, state: { ...ownerState(owner), defaultDashboardGuid: selected,
      dashboardOrder: ['missing-order', ...ownerState(owner).dashboardOrder] }, preservation: { references, transfers: [] } }));
    await workspace.reloadActiveWorkspace(false);
    const next = { ...commands.ownerView(homeAccountOwner).state!, dashboardOrder: ['missing-order', ...records.map(item => item.guid).reverse()] };
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, next))).state).toBe('committed');
    expect(commands.ownerView(homeAccountOwner).state).toEqual(next); expect(store.homeOwners()[0].preservation?.references).toEqual(references);
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...next, defaultDashboardGuid: 'new-missing' }))).state).toBe('failed');
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...next, dashboardOrder: [...next.dashboardOrder, 'new-missing'] }))).state).toBe('failed');
    const costs = records.find(item => item.template?.template === 'costs')!;
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...next, defaultDashboardGuid: costs.guid }))).state).toBe('committed');
    expect(store.homeOwners()[0].preservation?.references).toEqual(references.filter(ref => ref.path !== 'defaultDashboardGuid'));
    const state = commands.ownerView(homeAccountOwner).state!;
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...state, dashboardOrder: state.dashboardOrder.filter(guid => guid !== 'missing-order') }))).state).toBe('committed');
    expect(store.homeOwners()[0].preservation?.references).toEqual([]);
  });
  it('retains blocked foreign chart intent through unrelated edits and duplication until explicit valid repair', async () => {
    const { records } = await initialize(), home = records[0], chart = store.savedVisualizations()[0];
    await harness.seed({ savedVisualizations: [{ ...chart, id: 20, guid: 'foreign-chart', accountId: 'account-b', definition: { ...(chart.definition as object), accountGuid: 'account-b' } }] });
    const path = `widgets.${definition(home).widgets[0].id}.visualizationGuid`;
    const imported = { ...home, definition: { ...definition(home), widgets: [{ ...definition(home).widgets[0], visualizationGuid: 'foreign-chart' }] },
      preservation: { references: [{ path, kind: 'visualization' as const, guid: 'foreign-chart', reason: 'not-transferred' as const }], transfers: [] } };
    await firstValueFrom(harness.dbService.update('homeDashboards', imported)); await workspace.reloadActiveWorkspace(false);
    expect((await commands.submit(commands.prepareUpdate(current(home.guid), { ...definition(current(home.guid)), name: 'Retained foreign link' }))).state).toBe('committed');
    expect(current(home.guid).preservation?.references).toEqual(imported.preservation.references);
    expect((await commands.submit(commands.prepareDuplicate(current(home.guid)))).state).toBe('committed');
    const copy = store.homeDashboards().find(item => definition(item).name.endsWith('(Copy)'))!;
    expect((await commands.submit(commands.prepareUpdate(copy, { ...definition(copy), name: 'Copy renamed' }))).state).toBe('committed');
    expect((await commands.submit(commands.prepareUpdate(current(home.guid), definition(current(home.guid)), [path]))).state).toBe('failed');
    const repaired = { ...definition(current(home.guid)), widgets: [{ ...definition(current(home.guid)).widgets[0], visualizationGuid: chart.guid }] } as HomeDashboardDefinition;
    expect((await commands.submit(commands.prepareUpdate(current(home.guid), repaired, [path]))).state).toBe('committed');
    expect(current(home.guid).preservation?.references).toEqual([]);
  });
  const base = { id: 'target', size: 'half' as const, visibility: 'always' as const };
  const missingTargets: { name: string; widget: HomeWidget }[] = [
    { name: 'chart', widget: { ...base, kind: 'visualization', visualizationGuid: 'missing', inherit: [], overrides: {} } },
    { name: 'reporting owner', widget: { ...base, kind: 'goal', binding: { kind: 'reporting', owner: { kind: 'facility', guid: 'missing' }, category: 'energy' } } },
    { name: 'exact analysis', widget: { ...base, kind: 'goal', binding: { kind: 'exact', analysisGuid: 'missing' } } },
    { name: 'shortcut owner', widget: { ...base, kind: 'shortcut', destination: { area: 'data', owner: { kind: 'facility', guid: 'missing' } } } },
    ...(['meter', 'predictor', 'equipment', 'analysis'] as const).map(kind => ({ name: `shortcut ${kind}`, widget: { ...base, kind: 'shortcut' as const,
      destination: { area: 'data' as const, owner: { kind: 'facility' as const, guid: facility.guid }, resource: { kind, guid: 'missing' } } } }))
  ];
  it.each(missingTargets)('rejects a newly missing $name target atomically in edits and fresh graphs', async ({ widget }) => {
    const { records } = await initialize(), home = records[0];
    const before = await harness.getAll('homeDashboards'), owners = await harness.getAll('homeOwners'), charts = await harness.getAll('savedVisualizations');
    const value = homeDefinition([widget]);
    expect((await commands.submit(commands.prepareUpdate(home, value))).state).toBe('failed');
    if (widget.kind !== 'visualization') expect((await commands.submit(commands.prepareCreate(homeAccountOwner, { template: 'home', version: 1, dashboard: value, charts: [] }))).state).toBe('failed');
    expect(await harness.getAll('homeDashboards')).toEqual(before); expect(await harness.getAll('homeOwners')).toEqual(owners);
    expect(await harness.getAll('savedVisualizations')).toEqual(charts);
  });
  it('retains an unchanged deleted source but rejects a new namespace with the same unavailable GUID', async () => {
    const { records } = await initialize(), home = records[0];
    const meter = { ...getNewIdbUtilityMeter(facility.guid, account.guid, true, 'kWh'), guid: 'removed-source' };
    await harness.seed({ utilityMeter: [meter] });
    const widget: HomeWidget = { ...base, kind: 'shortcut', destination: { area: 'data', owner: { kind: 'facility', guid: facility.guid }, resource: { kind: 'meter', guid: meter.guid } } };
    expect((await commands.submit(commands.prepareUpdate(home, homeDefinition([widget])))).state).toBe('committed');
    const row = (await harness.getAll('utilityMeter'))[0]; await firstValueFrom(harness.dbService.delete('utilityMeter', row.id!));
    const retained = current(home.guid);
    const changed: HomeWidget = { ...widget, destination: { ...widget.destination, resource: { kind: 'predictor', guid: meter.guid } } };
    expect((await commands.submit(commands.prepareUpdate(retained, homeDefinition([changed])))).state).toBe('failed');
    expect((await commands.submit(commands.prepareUpdate(retained, { ...definition(retained), name: 'Source still unavailable' }))).state).toBe('committed');
    expect(definition(current(home.guid)).widgets).toEqual([widget]); expect(await harness.getAll('utilityMeter')).toEqual([]);
  });
  it('does not treat a different foreign namespace with a coincident GUID as retained intent', async () => {
    const { records } = await initialize(), home = records[0];
    const meter = { ...getNewIdbUtilityMeter('foreign-facility', 'account-b', true, 'kWh'), guid: 'coincident' };
    await harness.seed({ utilityMeter: [meter], predictor: [{ guid: meter.guid, accountId: 'account-b', facilityId: 'foreign-facility' }] });
    const widget: HomeWidget = { ...base, kind: 'shortcut', destination: { area: 'data', owner: { kind: 'facility', guid: facility.guid }, resource: { kind: 'meter', guid: meter.guid } } };
    const imported = { ...home, definition: homeDefinition([widget]), preservation: { references: [
      { path: `widgets.${widget.id}.destination.resource.guid`, kind: 'meter' as const, guid: meter.guid, reason: 'not-transferred' as const }], transfers: [] } };
    await firstValueFrom(harness.dbService.update('homeDashboards', imported)); await workspace.reloadActiveWorkspace(false);
    expect((await commands.submit(commands.prepareUpdate(current(home.guid), { ...definition(current(home.guid)), name: 'Retained meter' }))).state).toBe('committed');
    const changed: HomeWidget = { ...widget, destination: { ...widget.destination, resource: { kind: 'predictor', guid: meter.guid } } };
    expect((await commands.submit(commands.prepareUpdate(current(home.guid), homeDefinition([changed])))).state).toBe('failed');
    expect(definition(current(home.guid)).widgets).toEqual([widget]);
  });
  it('protects every affected starter after linked chart edits/deletion and exposes recoverable widget dependencies', async () => {
    const { records } = await initialize(), chart = store.savedVisualizations()[0];
    const visualizations = TestBed.inject(SavedVisualizationCommands);
    expect(visualizations.dependencies(chart.guid).widgets).toHaveLength(2);
    const read = (await import('@data/visualizations/saved-visualization-record')).readSavedVisualization(chart);
    if (!('definition' in read)) throw new Error('Expected supported chart');
    expect((await visualizations.submit({ kind: 'update', accountGuid: account.guid, guid: chart.guid, expectedRevision: chart.revision,
      definition: { ...read.definition, name: 'User chart edit' } })).state).toBe('committed');
    for (const record of records.slice(0, 2)) expect(current(record.guid).template?.customized).toBe(true);
    const updated = store.savedVisualizations()[0];
    await visualizations.submit({ kind: 'update', accountGuid: account.guid, guid: updated.guid, expectedRevision: updated.revision, definition: read.definition });
    for (const record of records.slice(0, 2)) expect(current(record.guid).template?.customized).toBe(true);
    const next = store.savedVisualizations()[0];
    await visualizations.submit(visualizations.prepareDelete(next));
    expect(store.savedVisualizations()).toHaveLength(0); expect(visualizations.dependencies(chart.guid).widgets).toHaveLength(2);
    expect(definition(current(records[0].guid)).widgets[0]).toMatchObject({ visualizationGuid: chart.guid });
    const proposal = commands.prepareTemplateReplacement(current(records[0].guid), { ...storageBlueprints()[0], version: 2 }, 'upgrade');
    expect(await commands.submit(proposal)).toMatchObject({ state: 'unchanged', value: { skipped: 'protected' } });
  });
  it('upgrades only untouched original starters and protects saved edits even after their visible values return', async () => {
    const { records } = await initialize(), home = records[0], costs = records.find(record => record.template?.template === 'costs')!;
    await commands.submit(commands.prepareUpdate(costs, { ...definition(costs), name: 'Customized costs' }));
    await commands.submit(commands.prepareUpdate(current(costs.guid), definition(costs)));
    const before = commands.ownerView(homeAccountOwner).state;
    expect((await commands.submit(commands.prepareTemplateReplacement(home, { ...storageBlueprints()[0], version: 2 }, 'upgrade'))).state).toBe('committed');
    expect(current(home.guid).template?.version).toBe(2); expect(store.savedVisualizations()).toHaveLength(2);
    expect(await commands.submit(commands.prepareTemplateReplacement(current(costs.guid), { ...storageBlueprints()[3], version: 2 }, 'upgrade')))
      .toMatchObject({ state: 'unchanged', value: { skipped: 'protected' } });
    expect(commands.ownerView(homeAccountOwner).state).toEqual(before);
  });
  it('keeps owner sets independent and exposes the sole facility without creating analysis pairs', async () => {
    await firstValueFrom(harness.dbService.update('accounts', { ...account, isSingleFacilityCompany: true }));
    await workspace.reloadActiveWorkspace(false);
    const owner: HomeOwner = { kind: 'facility', guid: facility.guid };
    expect((await commands.submit(commands.preparePresentedInitialization(storageBlueprints(owner)))).state).toBe('committed');
    expect(store.homeOwners()).toHaveLength(1); expect(store.homeOwners()[0].facilityId).toBe(facility.guid);
    expect(store.homeDashboards().every(record => record.facilityId === facility.guid)).toBe(true);
    expect(await harness.getAll('analysisItems')).toEqual([]); expect(await harness.getAll('accountAnalysisItems')).toEqual([]);
    await initialize(homeAccountOwner); expect(store.homeOwners()).toHaveLength(2);
    expect(commands.ownerView(homeAccountOwner).records).toHaveLength(6); expect(commands.ownerView(owner).records).toHaveLength(6);
    await harness.seed({ facilities: [{ ...facility, id: 2, guid: 'facility-b' }] }); await workspace.reloadActiveWorkspace(false);
    expect(() => commands.preparePresentedInitialization(storageBlueprints())).toThrow('single-facility');
  });
  it('retains publication recovery across account switches without restoring the departed account', async () => {
    await harness.seed({ accounts: [{ ...account, id: 2, guid: 'account-b' }] });
    const handler = TestBed.inject(HomeCommandHandler), original = handler.execute.bind(handler);
    const persist = vi.spyOn(handler, 'execute').mockImplementationOnce(async (command, active) => {
      const value = await original(command, active);
      await workspace.selectAccount('account-b');
      return value;
    });
    const proposal = commands.prepareInitialize(homeAccountOwner, storageBlueprints());
    expect((await commands.submit(proposal)).state).toBe('refresh-required');
    expect(store.account()?.guid).toBe('account-b'); expect(store.homeDashboards()).toEqual([]);
    await expect(commands.recover(account.guid, proposal.operationGuid)).rejects.toMatchObject({ code: 'stale-workspace' });
    await workspace.selectAccount(account.guid);
    await commands.recover(account.guid, proposal.operationGuid);
    expect(store.committedRevision()?.accountGuid).toBe(account.guid); expect(store.homeDashboards()).toHaveLength(6);
    expect((await commands.submit(proposal)).state).toBe('committed'); expect(persist).toHaveBeenCalledTimes(1);
  });
  it('recovers hidden or invalid defaults in saved order without hydration writes or source-change customization', async () => {
    const { records } = await initialize(), water = records.find(record => record.template?.template === 'water')!;
    const state = commands.ownerView(homeAccountOwner).state!;
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...state, defaultDashboardGuid: water.guid }))).state).toBe('failed');
    await harness.seed({ utilityMeter: [{ guid: 'water-meter', accountId: account.guid, facilityId: facility.guid, source: 'Water Intake' }] });
    await workspace.reloadActiveWorkspace(false);
    expect((await commands.submit(commands.prepareConfigure(homeAccountOwner, { ...state, defaultDashboardGuid: water.guid }))).state).toBe('committed');
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(water.guid);
    const meter = (await harness.getAll('utilityMeter'))[0];
    await firstValueFrom(harness.dbService.delete('utilityMeter', meter.id!)); await workspace.reloadActiveWorkspace(false);
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(records[0].guid);
    expect(commands.ownerView(homeAccountOwner).state?.defaultDashboardGuid).toBe(water.guid);
    expect(store.homeDashboards().every(record => record.template?.customized === false)).toBe(true);
    const owner = store.homeOwners()[0];
    await firstValueFrom(harness.dbService.update('homeOwners', { ...owner, state: { ...ownerState(owner), defaultDashboardGuid: 'deleted-dashboard' } }));
    await workspace.reloadActiveWorkspace(false);
    expect(commands.ownerView(homeAccountOwner).defaultDashboardGuid).toBe(records[0].guid);
    expect(commands.ownerView(homeAccountOwner).state?.defaultDashboardGuid).toBe('deleted-dashboard');
  });
  it('protects pristine shared-chart placeholders on deletion and rejects an intervening stale template replacement', async () => {
    const { records } = await initialize(), chart = store.savedVisualizations()[0];
    const upgrade = commands.prepareTemplateReplacement(records[0], { ...storageBlueprints()[0], version: 2 }, 'upgrade');
    await TestBed.inject(SavedVisualizationCommands).submit(TestBed.inject(SavedVisualizationCommands).prepareDelete(chart));
    expect(records.slice(0, 2).every(record => current(record.guid).template?.customized)).toBe(true);
    expect((await commands.submit(upgrade)).state).toBe('conflict');
    expect(store.savedVisualizations()).toEqual([]);
    expect(definition(current(records[0].guid)).widgets).toEqual(definition(records[0]).widgets);
  });
});
