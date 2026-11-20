import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbCascadeDeleteService } from '@data/indexedDB/indexed-db-cascade-delete.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbHomeDashboard, IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceLoaderService } from '@data/account-workspace/account-workspace-loader.service';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { storageBlueprints } from '@data/home/testing/home-command-fixtures';
import { readHomeDashboard, readHomeWidget } from '@data/home/home-record';
import { homeAccountOwner, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { HomeDashboardDefinition, HomeOwner } from '@domain/home/home-dashboard';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { BackupImportCommandService } from './backup-import-command.service';
import { savedVisualizationFixture, visualizationBackupSnapshot } from './visualization-backup.testing';
import { analysisVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';

describe('Home backup/copy/delete native acceptance', () => {
  let harness: IndexedDbTestHarness, commands: HomeCommands, store: AccountWorkspaceStore;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', name: 'First' };
  const facilityOwner: HomeOwner = { kind: 'facility', guid: facility.guid };
  const builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
  const definition = (record: Readonly<IdbHomeDashboard>) => (readHomeDashboard(record) as { state: 'valid'; value: HomeDashboardDefinition }).value;
  const localStorage = () => TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService,
    useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
  const writer = () => new BackupImportCommandService(TestBed.inject(IndexedDbTransactionService),
    { setCurrentLoadingIndex() {}, setLoadingMessage() {} } as unknown as LoadingService);
  const load = (guid = account.guid) => TestBed.inject(AccountWorkspaceLoaderService).load(guid);
  const prepare = (value: unknown) => preparation.prepare(JSON.parse(JSON.stringify(value)));
  async function initialize(owner: HomeOwner) {
    expect((await commands.submit(commands.prepareInitialize(owner, storageBlueprints(owner)))).state).toBe('committed');
  }
  beforeEach(async () => {
    localStorage(); harness = await IndexedDbTestHarness.create('home-transfer');
    await harness.seed({ accounts: [account], facilities: [facility] });
    store = TestBed.inject(AccountWorkspaceStore); commands = TestBed.inject(HomeCommands);
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it.each(['Account', 'Facility'] as const)('round trips a %s graph with shared charts, settings, provenance and selected default through JSON/save/reopen', async kind => {
    const owner = kind === 'Account' ? homeAccountOwner : facilityOwner;
    await initialize(owner);
    const home = commands.ownerView(owner).records[0];
    await commands.submit(commands.prepareUpdate(home, { ...definition(home), name: 'My overview', defaults: { emissionsTreatment: 'location' },
      widgets: definition(home).widgets.map(widget => ({ ...widget, size: 'full' })) }));
    const view = commands.ownerView(owner), costs = view.records.find(record => record.template?.template === 'costs')!;
    const builtIn = { kind: 'built-in' as const, template: 'home' as const, version: 99 };
    await commands.submit(commands.prepareConfigure(owner, { ...view.state!, defaultDashboardGuid: costs.guid,
      views: { version: 1, catalog: [builtIn], order: view.records.map(record => ({ kind: 'saved', dashboardGuid: record.guid })),
        default: { kind: 'saved', dashboardGuid: costs.guid }, hidden: [{ kind: 'saved', dashboardGuid: home.guid }], deleted: [builtIn] } }));
    const source = await load(), before = structuredClone(source);
    const backup = prepare(kind === 'Account' ? builder.buildAccountBackup(source) : builder.buildFacilityBackup(source, facility.guid));
    const service = writer();
    let targetAccount: string;
    if (kind === 'Account') targetAccount = (await service.importAccountBackupFile(backup, 0)).guid;
    else {
      targetAccount = 'destination'; await harness.seed({ accounts: [{ ...account, id: 2, guid: targetAccount }] });
      await service.importFacilityBackupFile(backup, targetAccount, 0);
    }
    expect(service.visualizationImportSummary()?.home).toMatchObject({ dashboards: 6, owners: 1, locked: 0, repairRequired: 0 });
    await harness.reopen();
    const restored = await load(targetAccount), dashboard = restored.homeDashboards.find(record => definition(record).name === 'My overview')!;
    expect(restored.homeDashboards).toHaveLength(6); expect(restored.savedVisualizations).toHaveLength(1);
    expect(dashboard.guid).not.toBe(home.guid); expect(dashboard.accountId).toBe(targetAccount);
    expect(dashboard.facilityId).toBe(kind === 'Facility' ? restored.facilities[0].guid : undefined);
    expect(definition(dashboard)).toMatchObject({ defaults: { emissionsTreatment: 'location' }, widgets: [{ size: 'full' }] });
    expect(dashboard.template?.customized).toBe(true);
    const chartGuid = restored.savedVisualizations[0].guid;
    const linked = restored.homeDashboards.filter(record => definition(record).widgets.length);
    expect(linked).toHaveLength(2);
    for (const record of linked) {
      expect(definition(record).widgets[0]).toMatchObject({ visualizationGuid: chartGuid });
      expect(record.template?.chartBaselines).toEqual([{ guid: chartGuid, revision: 1 }]);
      expect(record.preservation?.references).toEqual([]);
    }
    expect(restored.savedVisualizations[0].homeOrigin?.owner).toEqual({ kind: owner.kind,
      guid: kind === 'Account' ? targetAccount : restored.facilities[0].guid });
    expect((restored.homeOwners[0].state as any).defaultDashboardGuid).toBe(restored.homeDashboards.find(record => record.template?.template === 'costs')!.guid);
    expect((restored.homeOwners[0].state as any).dashboardOrder).toEqual(restored.homeDashboards.map(record => record.guid));
    expect((restored.homeOwners[0].state as any).views).toEqual({ version: 1, catalog: [builtIn],
      order: restored.homeDashboards.map(record => ({ kind: 'saved', dashboardGuid: record.guid })),
      default: { kind: 'saved', dashboardGuid: restored.homeDashboards.find(record => record.template?.template === 'costs')!.guid },
      hidden: [{ kind: 'saved', dashboardGuid: dashboard.guid }], deleted: [builtIn] });
    expect(prepare(builder.buildAccountBackup(restored)).homeDashboards).toHaveLength(6);
    expect(await load()).toEqual(before);
  });

  it('retains unavailable cross-scope chart and reporting intent through facility copy, layout edits and another account transfer', async () => {
    await harness.seed({ facilities: [{ ...facility, id: 2, guid: 'facility-b', name: 'Second' }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(false);
    await initialize(homeAccountOwner); await initialize(facilityOwner);
    const accountChart = store.savedVisualizations()[0], home = commands.ownerView(facilityOwner).records[0];
    await commands.submit(commands.prepareUpdate(home, { ...definition(home), widgets: [
      { ...definition(home).widgets[0], kind: 'visualization', visualizationGuid: accountChart.guid } as any,
      { id: 'follow', kind: 'goal', size: 'half', visibility: 'always', binding: { kind: 'reporting', owner: homeAccountOwner, category: 'energy' } }
    ] }));
    const backup = prepare(builder.buildFacilityBackup(await load(), facility.guid));
    expect(backup.savedVisualizations.some(chart => chart.guid === accountChart.guid)).toBe(false);
    const targetAccount = 'destination'; await harness.seed({ accounts: [{ ...account, id: 2, guid: targetAccount }] });
    const targetFacility = (await writer().importFacilityBackupFile(backup, targetAccount, 0)).facility;
    await TestBed.inject(AccountWorkspaceService).selectAccount(targetAccount);
    const copied = store.homeDashboards().find(record => definition(record).widgets.length === 2)!;
    const widgetId = definition(copied).widgets[0].id;
    expect(readHomeWidget(copied, widgetId).state).toBe('repair-required'); expect(readHomeWidget(copied, 'follow').state).toBe('repair-required');
    expect((await commands.submit(commands.prepareUpdate(copied, { ...definition(copied), name: 'Layout still editable' }))).state).toBe('committed');
    const again = prepare(builder.buildAccountBackup(await load(targetAccount)));
    const third = await writer().importAccountBackupFile(again, 0);
    await harness.reopen();
    const result = (await load(third.guid)).homeDashboards.find(record => definition(record).name === 'Layout still editable')!;
    expect(readHomeWidget(result, widgetId).state).toBe('repair-required');
    expect(definition(result).widgets[0]).toMatchObject({ visualizationGuid: accountChart.guid });
    expect(definition(result).widgets[1]).toMatchObject({ binding: { kind: 'reporting', owner: homeAccountOwner } });
    expect(result.preservation?.transfers).toHaveLength(2); expect(result.facilityId).not.toBe(targetFacility.guid);
  });

  it('rolls back replacement deletion and protection, then accepts an older backup without reseeding or deleting surviving layouts', async () => {
    await initialize(homeAccountOwner); await initialize(facilityOwner);
    const before = await load(), legacy = builder.buildFacilityBackup(before, facility.guid);
    delete legacy.homeDashboards; delete legacy.homeOwners;
    const backup = prepare(legacy), service = writer();
    const original = IndexedDbTransactionContext.prototype.add;
    const failure = vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function(name, value) {
      if (name === 'facilities') throw new Error('replacement rollback');
      return original.call(this, name, value);
    });
    await expect(service.replaceFacilityBackupFile(backup, account.guid, facility, 0)).rejects.toThrow('replacement rollback');
    expect(await load()).toEqual(before); expect(service.visualizationImportSummary()).toBeUndefined();
    failure.mockRestore();
    const replacement = await service.replaceFacilityBackupFile(backup, account.guid, facility, 0);
    await harness.reopen();
    const after = await load();
    expect(after.facilities[0].guid).toBe(replacement.facility.guid);
    expect(after.homeDashboards).toHaveLength(6); expect(after.homeOwners).toHaveLength(1);
    expect(after.homeDashboards.every(record => record.facilityId === undefined)).toBe(true);
    const linked = after.homeDashboards.filter(record => definition(record).widgets.length);
    expect(linked.every(record => record.template?.customized)).toBe(true);
    expect(definition(linked[0]).widgets).toEqual(definition(before.homeDashboards[0]).widgets);
    expect(after.savedVisualizations.some(chart => chart.guid === before.savedVisualizations[0].guid)).toBe(false);
  });

  it('preserves opaque records and initialized-empty owners through native restore/reopen/reexport without seeding', async () => {
    const future = { ...getNewIdbHomeDashboard(account.guid, facilityOwner, homeDefinition()), recordVersion: 90,
      definition: { version: 91, future: ['facility-a', null, 0] } };
    const owner = { ...getNewIdbHomeOwner(account.guid, facilityOwner, homeOwnerState()), recordVersion: 90, state: { future: 'intent' } };
    const empty = getNewIdbHomeOwner(account.guid, homeAccountOwner, { ...homeOwnerState(), deletedStarters: ['home', 'water'] });
    await harness.seed({ homeDashboards: [future], homeOwners: [owner, { ...empty }] });
    const backup = prepare(builder.buildAccountBackup(await load())), service = writer();
    const target = await service.importAccountBackupFile(backup, 0);
    expect(service.visualizationImportSummary()?.home).toMatchObject({ locked: 2, dashboards: 1, owners: 2 });
    const restored = await load(target.guid), exported = prepare(builder.buildAccountBackup(restored));
    expect(exported.homeDashboards[0].definition).toEqual(future.definition); expect(exported.homeDashboards[0].preservation?.locked).toBe(true);
    expect(exported.homeOwners.find(record => record.facilityId)?.state).toEqual(owner.state);
    await TestBed.inject(AccountWorkspaceService).selectAccount(target.guid);
    commands = TestBed.inject(HomeCommands);
    expect((await commands.submit(commands.prepareInitialize({ kind: 'account', guid: target.guid }, storageBlueprints({ kind: 'account', guid: target.guid })))).state).toBe('unchanged');
    const targetOwner: HomeOwner = { kind: 'facility', guid: restored.facilities[0].guid };
    expect((await commands.submit(commands.prepareInitialize(targetOwner, storageBlueprints(targetOwner, target.guid)))).state).toBe('failed');
    await harness.reopen();
    expect((await load(target.guid)).homeDashboards).toEqual(restored.homeDashboards);
  });

  it('rolls back an imported graph when a later Home write fails', async () => {
    await initialize(homeAccountOwner);
    const before = await load(), backup = prepare(builder.buildAccountBackup(before));
    const original = IndexedDbTransactionContext.prototype.add;
    let writes = 0;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function(name, value) {
      if (name === 'homeDashboards' && ++writes === 2) throw new Error('Home import rollback');
      return original.call(this, name, value);
    });
    const service = writer(); await expect(service.importAccountBackupFile(backup, 0)).rejects.toThrow('Home import rollback');
    expect(await harness.getAll('accounts')).toHaveLength(1); expect(await load()).toEqual(before);
    expect(service.visualizationImportSummary()).toBeUndefined();
  });

  it.each(['Account', 'Facility'] as const)('remaps explicit reporting rules alongside exact analyses in a %s backup without resolving either rule', async kind => {
    const exact = analysisVisualizationFixture();
    const reporting = (owner: HomeOwner) => ({ ...exact, name: `${owner.kind} reporting`, sources: [{ id: 'analysis', kind: 'analysis' as const,
      mode: 'result' as const, measure: 'actual' as const, aggregation: 'none' as const,
      reporting: { kind: 'reporting' as const, owner, category: 'energy' as const } }] });
    const snapshot = { ...visualizationBackupSnapshot(), savedVisualizations: [savedVisualizationFixture(exact, 'exact'), savedVisualizationFixture(reporting(facilityOwner), 'facility-follow'),
      savedVisualizationFixture(reporting(homeAccountOwner), 'account-follow')],
      homeDashboards: [getNewIdbHomeDashboard(account.guid, facilityOwner, homeDefinition([
      { id: 'exact', kind: 'goal', size: 'half', visibility: 'always', binding: { kind: 'exact', analysisGuid: 'analysis-a' } },
      { id: 'follow', kind: 'goal', size: 'half', visibility: 'always', binding: { kind: 'reporting', owner: facilityOwner, category: 'water' } }
    ]))] };
    const backup = prepare(kind === 'Account' ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, facility.guid));
    let target = account.guid;
    if (kind === 'Account') target = (await writer().importAccountBackupFile(backup, 0)).guid;
    else await writer().importFacilityBackupFile(backup, target, 0);
    await harness.reopen(); const restored = await load(target);
    const copied = restored.facilities.find(item => item.guid !== facility.guid)!;
    const read = (name: string) => readSavedVisualization(restored.savedVisualizations.find(chart => (chart.definition as any).name === name)!);
    expect(read('Analysis result')).toMatchObject({ state: 'valid', definition: { sources: [{ analysisGuid: restored.facilityAnalyses[0].guid }] } });
    expect(read('facility reporting')).toMatchObject({ state: 'valid', definition: { sources: [{ reporting: { owner: { kind: 'facility', guid: copied.guid }, category: 'energy' } }] } });
    const accountRule = read('account reporting');
    expect(accountRule.state).toBe(kind === 'Account' ? 'valid' : 'repair-required');
    if ('definition' in accountRule) {
      expect(accountRule.definition.sources[0]).toMatchObject({ reporting: { owner: { kind: 'account', guid: target } } });
      expect(accountRule.definition.sources[0]).not.toHaveProperty('analysisGuid');
    }
    const home = definition(restored.homeDashboards[0]);
    expect(home.widgets[0]).toMatchObject({ binding: { kind: 'exact', analysisGuid: restored.facilityAnalyses[0].guid } });
    expect(home.widgets[1]).toMatchObject({ binding: { kind: 'reporting', owner: { kind: 'facility', guid: copied.guid }, category: 'water' } });
  });

  it('shares only verified cross-facility links within a selected-facility copy operation', async () => {
    const second = { ...facility, id: 2, guid: 'facility-b', name: 'Second' };
    await harness.seed({ facilities: [second] }); await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(false);
    await initialize(facilityOwner); await initialize({ kind: 'facility', guid: second.guid });
    const home = commands.ownerView(facilityOwner).records[0], otherChart = store.savedVisualizations()[1];
    await commands.submit(commands.prepareUpdate(home, { ...definition(home), widgets: [{ ...definition(home).widgets[0], visualizationGuid: otherChart.guid } as any] }));
    const snapshot = await load(), full = prepare(builder.buildAccountBackup(snapshot));
    const selections = snapshot.facilities.map(selectedFacility => ({ selectedFacility, backup: preparation.extractFacility(full, selectedFacility.guid) }));
    const destination = { ...account, id: 2, guid: 'destination' }; await harness.seed({ accounts: [destination] });
    await writer().importSelectedFacilities(destination, selections, { First: { importAs: 'new' }, Second: { importAs: 'new' } }, []);
    await harness.reopen(); const copied = await load(destination.guid);
    const firstOwner = copied.facilities.find(item => item.name === 'First')!, secondOwner = copied.facilities.find(item => item.name === 'Second')!;
    const first = copied.homeDashboards.find(record => record.facilityId === firstOwner.guid && record.template?.template === 'home')!;
    const next = copied.homeDashboards.find(record => record.facilityId === secondOwner.guid && record.template?.template === 'home')!;
    expect(definition(first).widgets[0]).toMatchObject({ visualizationGuid: (definition(next).widgets[0] as any).visualizationGuid });
    expect(first.preservation?.references).toEqual([]); expect(copied.savedVisualizations).toHaveLength(2);
  });

  it('deletes only the selected owner graph, protects surviving shared appearances and preserves another account', async () => {
    await initialize(homeAccountOwner); await initialize(facilityOwner);
    const backup = prepare(builder.buildAccountBackup(await load()));
    const other = await writer().importAccountBackupFile(backup, 0), otherBefore = await load(other.guid);
    const deletion = TestBed.inject(IndexedDbCascadeDeleteService);
    await deletion.deleteFacility(facility, account.guid);
    const remaining = await load();
    expect(remaining.homeDashboards).toHaveLength(6); expect(remaining.homeOwners).toHaveLength(1);
    expect(remaining.homeDashboards.filter(record => definition(record).widgets.length).every(record => record.template?.customized)).toBe(true);
    await deletion.deleteAccount(account);
    expect((await harness.getAll('homeDashboards')).every(record => record.accountId === other.guid)).toBe(true);
    expect((await harness.getAll('homeOwners')).every(record => record.accountId === other.guid)).toBe(true);
    expect(await load(other.guid)).toEqual(otherBefore);
  });
});
