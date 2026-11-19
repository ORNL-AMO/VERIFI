import { createCaptureOrigin, unchangedCaptureSource } from '@data/visualizations/visualization-capture-origin';
import { serializeVisualizationDefinition } from '@domain/visualizations/visualization-source-groups';
import { normalizeVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { savedVisualizationFacilityGuid } from '@data/visualizations/saved-visualization-record';
import { vi } from 'vitest';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { visualizationReferences } from '@domain/visualizations/visualization-references';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import type { EnergyUseVisualizationSource } from '@domain/visualizations/visualization-definition';
import { equipmentDefinition, equipmentFixture } from '@domain/visualizations/testing/equipment-fixtures';
import { BackupImportCommandService } from './backup-import-command.service';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { savedVisualizationFixture, visualizationBackupSnapshot } from './visualization-backup.testing';

describe('saved visualization backup transactions in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
  beforeEach(async () => { harness = await IndexedDbTestHarness.create('visualization-backup'); });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it.each((['Account', 'Facility'] as const).flatMap(kind => (['time-series', 'monthly-patterns', 'year-to-date'] as const).map(chartKind => ({ kind, chartKind }))))('retains smoothing, capture origin and pinned settings through a $kind $chartKind backup', async ({ kind, chartKind }) => {
    const base = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    const definition = { ...base, chart: chartKind === 'monthly-patterns' ? { kind: 'monthly-patterns' as const, smoothLines: true, yearOverrides: { '2026': { visible: false, color: '#23684d' } } } : { kind: 'time-series' as const, interval: chartKind === 'year-to-date' ? 'yearly' as const : 'monthly' as const, ...(chartKind === 'year-to-date' ? { yearToDate: true } : {}), defaultTraceType: 'line' as const, stack: 'none' as const, smoothLines: true },
      sources: base.sources.map(source => ({ ...source, settings: { unit: { kind: 'pinned' as const, value: 'kWh' }, energyTreatment: { kind: 'pinned' as const, value: 'site' as const } } })) };
    const record = savedVisualizationFixture(definition);
    record.captureOrigin = createCaptureOrigin({ kind: chartKind === 'monthly-patterns' ? 'meter-monthly-patterns' : chartKind === 'year-to-date' ? 'meter-yearly' : 'meter-monthly', facilityGuid: 'facility-a', meterGuid: 'meter-a' }, definition);
    const snapshot = { ...visualizationBackupSnapshot(), savedVisualizations: [record] };
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
    const service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else { await harness.seed({ accounts: [{ guid: 'destination', name: 'Destination' }] }); accountGuid = 'destination'; await service.importFacilityBackupFile(backup, accountGuid, 0); }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid), decoded = readSavedVisualization(restored.savedVisualizations[0]);
    expect(decoded).toMatchObject({ state: 'valid', definition: { chart: { smoothLines: true }, sources: [{ settings: { unit: { kind: 'pinned', value: 'kWh' }, energyTreatment: { kind: 'pinned', value: 'site' } } }] } });
    if (decoded.state !== 'valid') throw new Error('Expected a valid restored capture');
    if (chartKind === 'year-to-date') expect(decoded.definition.chart).toMatchObject({ interval: 'yearly', yearToDate: true });
    expect(unchangedCaptureSource(restored.savedVisualizations[0], decoded.definition, restored)).toMatchObject({ facilityGuid: restored.facilities[0].guid, meterGuid: restored.meters[0].guid });
    expect(unchangedCaptureSource(restored.savedVisualizations[0], { ...decoded.definition, appearance: { legend: false } }, restored)).toBeUndefined();
  });

  it.each((['Account', 'Facility'] as const).flatMap(kind => (['group', 'equipment-type', 'linked-meter-group', 'facility'] as const).map(mode => ({ kind, mode }))))('round trips $mode selection and appearance in a $kind backup', async ({ kind, mode }) => {
    const base = equipmentDefinition(), id = mode === 'facility' ? 'facility-a' : mode === 'group' ? 'energy-group-a' : mode === 'equipment-type' ? 'Pump' : 'group-a';
    const resource = mode === 'facility' ? 'facility' as const : mode === 'group' ? 'energy-use-group' as const : 'meter-group' as const;
    const source: EnergyUseVisualizationSource = { id: 'source-1', kind: 'energy-use', selectionMode: mode, measure: 'consumption', aggregation: 'sum', denominator: 'selected',
      ...(mode === 'equipment-type' ? { equipmentTypes: ['Pump'] } : { selection: { kind: 'fixed', resource, guids: [id] } }) };
    const prefix = `source-1:${mode === 'equipment-type' ? 'equipment-type' : resource}:`;
    const definition = { ...base, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a'] }, sources: [source], series: [{ ...base.series[0], overrides: [{ seriesId: `${prefix}${id}`, color: '#123456' }] }] };
    const snapshot = { ...visualizationBackupSnapshot(), savedVisualizations: [savedVisualizationFixture(definition)], energyUseEquipment: [equipmentFixture({ guid: 'equipment-a', energyUseGroupId: 'energy-group-a', equipmentType: 'Pump', utilityMeterGroupIds: ['group-a'] })] };
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
    const service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else { await harness.seed({ accounts: [{ guid: 'destination', name: 'Destination' }] }); accountGuid = 'destination'; await service.importFacilityBackupFile(backup, accountGuid, 0); }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid), decoded = readSavedVisualization(restored.savedVisualizations[0]);
    expect(decoded.state).toBe('valid'); if (!('definition' in decoded)) throw new Error('Expected readable grouped selection');
    const restoredSource = decoded.definition.sources[0] as EnergyUseVisualizationSource;
    const mappedId = mode === 'facility' ? restored.facilities[0].guid : mode === 'group' ? restored.energyUseGroups[0].guid : mode === 'equipment-type' ? 'Pump' : restored.meterGroups[0].guid;
    expect(restoredSource.selectionMode).toBe(mode);
    if (mode === 'equipment-type') expect(restoredSource.equipmentTypes).toEqual(['Pump']);
    else expect(restoredSource.selection).toEqual({ kind: 'fixed', resource, guids: [mappedId] });
    expect(decoded.definition.series[0].overrides).toEqual([{ seriesId: `${prefix}${mappedId}`, color: '#123456', accountGuid }]);
    expect(restored.energyUseEquipment[0].utilityMeterGroupIds).toEqual([restored.meterGroups[0].guid]);
    expect(preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored)))).savedVisualizations[0].definition).toEqual(serializeVisualizationDefinition(decoded.definition));
  });

  it.each(['Account', 'Facility'] as const)('round trips resource-bearing provider appearance in a %s backup', async kind => {
    const base = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    const { resourceGuid: _resource, ...series } = base.series[0];
    const definition = { ...base, series: [{ ...series, overrides: [
      { seriesId: 'utility:meter-a', visible: false, traceType: 'bar' as const, color: '#123456', lineStyle: 'dotted' as const, order: 0 }
    ] }] };
    const snapshot = { ...visualizationBackupSnapshot(), savedVisualizations: [savedVisualizationFixture(definition)] };
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account'
      ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
    const service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else {
      await harness.seed({ accounts: [{ guid: 'destination', name: 'Destination' }] });
      accountGuid = 'destination'; await service.importFacilityBackupFile(backup, accountGuid, 0);
    }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid), decoded = readSavedVisualization(restored.savedVisualizations[0]);
    expect(decoded.state).toBe('valid');
    if (!('definition' in decoded)) throw new Error('Expected current restored intent.');
    expect(decoded.definition.series[0].overrides).toEqual([{ seriesId: `utility:${restored.meters[0].guid}`,
      visible: false, traceType: 'bar', color: '#123456', lineStyle: 'dotted', order: 0, accountGuid }]);
    expect(preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored)))).savedVisualizations[0].definition).toEqual(serializeVisualizationDefinition(decoded.definition));
  });

  it.each((['Account', 'Facility'] as const).flatMap(kind => (['none', 'absolute', 'percent'] as const).map(stack => ({ kind, stack }))))('round trips area/$stack and exact item order in a $kind backup', async ({ kind, stack }) => {
    const base = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    const definition = { ...base, chart: { kind: 'time-series' as const, defaultTraceType: 'area' as const, interval: 'monthly' as const, stack }, series: [{ ...base.series[0], traceType: 'area' as const, overrides: [
      { accountGuid: base.accountGuid, resourceGuid: 'meter-a', order: 2 }
    ] }] };
    const snapshot = { ...visualizationBackupSnapshot(), savedVisualizations: [savedVisualizationFixture(definition)] };
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account'
      ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
    const service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else {
      await harness.seed({ accounts: [{ guid: 'destination', name: 'Destination' }] });
      accountGuid = 'destination'; await service.importFacilityBackupFile(backup, accountGuid, 0);
    }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid), decoded = readSavedVisualization(restored.savedVisualizations[0]);
    expect(decoded.state).toBe('valid');
    if (!('definition' in decoded)) throw new Error('Expected readable restored ordered item.');
    expect(decoded.definition.series[0].overrides).toEqual([
      { accountGuid, resourceGuid: decoded.definition.series[0].resourceGuid, order: 2 }
    ]);
    expect(decoded.definition.series[0].traceType).toBe('area');
    expect(decoded.definition.chart).toEqual(definition.chart);
    expect(decoded.definition.series[0].resourceGuid).toBe(restored.meters[0].guid);
    const reexported = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    expect(reexported.savedVisualizations[0].definition).toEqual(serializeVisualizationDefinition(decoded.definition));
  });

  it.each(['Account', 'Facility'] as const)('round trips incomplete mixed-family Scatter intent in a %s backup without fabricating bindings', async kind => {
    const definition = createVisualizationSetupDefinition({ name: 'Usage and weather', accountGuid: 'account-a',
      facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] }, chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] });
    const snapshot = { ...visualizationBackupSnapshot(), savedVisualizations: [savedVisualizationFixture(definition, 'scatter-setup')] };
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account'
      ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
    const before = structuredClone(backup), service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else {
      await harness.seed({ accounts: [{ guid: 'destination', name: 'Destination' }] });
      accountGuid = 'destination'; await service.importFacilityBackupFile(backup, accountGuid, 0);
    }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid); expect(restored.savedVisualizations).toHaveLength(1);
    const record = restored.savedVisualizations[0], decoded = readSavedVisualization(record);
    expect(record.guid).not.toBe('scatter-setup'); expect(record.accountId).toBe(accountGuid);
    expect(record.facilityId).toBeUndefined(); expect(savedVisualizationFacilityGuid(record, restored.facilities)).toBe(restored.facilities[0].guid); expect(record.recordVersion).toBe(1);
    expect(record.preservation.references).toEqual([]); expect(decoded.state).toBe('setup-required');
    if (!('definition' in decoded)) throw new Error('Expected readable restored setup.');
    expect(decoded.definition).toEqual(normalizeVisualizationDefinition({ ...definition, accountGuid, facilitySelection: { kind: 'fixed', facilityGuids: [restored.facilities[0].guid] } }));
    expect(decoded.definition.chart).not.toHaveProperty('xSeriesId'); expect(decoded.definition.chart).not.toHaveProperty('ySeriesId');
    const reexported = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    expect(reexported.savedVisualizations[0].definition).toEqual(serializeVisualizationDefinition(decoded.definition));
    expect(backup).toEqual(before);
  });

  it.each(['Account', 'Facility'] as const)('round trips all source families in a %s backup and preserves pinned comparison models', async kind => {
    const snapshot = { ...visualizationBackupSnapshot() };
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account'
      ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
    const before = structuredClone(backup), service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else {
      await harness.seed({ accounts: [{ guid: 'destination', name: 'Destination' }] });
      accountGuid = 'destination';
      await service.importFacilityBackupFile(backup, accountGuid, 0);
    }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid);
    expect(restored.savedVisualizations).toHaveLength(kind === 'Account' ? 8 : 7);
    const actualGuids = new Set([...restored.facilities, ...restored.meters, ...restored.meterGroups, ...restored.predictors,
      ...restored.energyUseEquipment, ...restored.energyUseGroups, ...restored.facilityAnalyses].map(item => item.guid));
    for (const record of restored.savedVisualizations) {
      expect(record.accountId).toBe(accountGuid);
      expect(record.revision).toBe(1);
      expect(record.guid).not.toMatch(/^visualization-/);
      const decoded = readSavedVisualization(record);
      expect(['valid', 'setup-required']).toContain(decoded.state);
      expect(record.preservation.references).toEqual([]);
      if ('definition' in decoded) {
        for (const reference of visualizationReferences(decoded.definition)) {
          if (reference.kind !== 'charge' && reference.kind !== 'model') expect(actualGuids.has(reference.guid)).toBe(true);
        }
      }
    }
    expect(restored.facilityAnalyses[0].groups[0].models.map(model => model.modelId)).toEqual(['model-a', 'model-b']);
    const reexported = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    expect(reexported.savedVisualizations.map(record => record.definition)).toEqual(restored.savedVisualizations.map(record => record.definition));
    expect(service.visualizationImportSummary()).toMatchObject({ accountGuid, locked: 0, repairRequired: 0 });
    expect(backup).toEqual(before);
  });

  it('keeps a missing source blocked even when the destination contains its old GUID', async () => {
    const snapshot = { ...visualizationBackupSnapshot() };
    const definition = utilityVisualizationFixture();
    snapshot.savedVisualizations = [savedVisualizationFixture({ ...definition,
      sources: [{ ...definition.sources[0], selection: { kind: 'fixed', resource: 'meter', guids: ['lost-meter'] } }] } as any)];
    await harness.seed({ accounts: [{ guid: 'other-account' }], utilityMeter: [{ guid: 'lost-meter', accountId: 'other-account', facilityId: 'other-facility' }] });
    const backup = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(snapshot))));
    const service = createService(), account = await service.importAccountBackupFile(backup, 0);
    const record = (await readSnapshot(account.guid)).savedVisualizations[0];
    expect(readSavedVisualization(record).state).toBe('repair-required');
    expect(record.preservation.references).toContainEqual(expect.objectContaining({ guid: 'lost-meter', reason: 'not-transferred' }));
    expect(service.visualizationImportSummary()).toMatchObject({ locked: 0, repairRequired: 1 });
  });

  it('retains opaque payloads and transfer history across a second backup restore', async () => {
    const snapshot = { ...visualizationBackupSnapshot() }, payload = { version: 99, chart: { future: true }, sourceGuid: 'meter-a' };
    snapshot.savedVisualizations = [{ ...savedVisualizationFixture(utilityVisualizationFixture()), definition: payload }];
    const service = createService();
    const first = await service.importAccountBackupFile(preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(snapshot)))), 0);
    const firstSnapshot = await readSnapshot(first.guid);
    const second = await service.importAccountBackupFile(preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(firstSnapshot)))), 0);
    await harness.reopen();
    const record = (await readSnapshot(second.guid)).savedVisualizations[0];
    expect(record.definition).toEqual(payload);
    expect(record.preservation.locked).toBe(true);
    expect(record.preservation.transfers).toHaveLength(2);
    expect(readSavedVisualization(record).state).toBe('repair-required');
  });

  it('uses the complete selected-facility batch map and retains explicit foreign-scope warnings', async () => {
    const snapshot = { ...visualizationBackupSnapshot() };
    snapshot.facilities = [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b', name: 'Facility B' }];
    snapshot.meterGroups = [...snapshot.meterGroups, { ...snapshot.meterGroups[0], guid: 'group-b', facilityId: 'facility-b' }];
    snapshot.meters = [...snapshot.meters, { ...snapshot.meters[0], guid: 'meter-b', facilityId: 'facility-b', groupId: 'group-b' }];
    const definition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    snapshot.savedVisualizations = [savedVisualizationFixture({ ...definition,
      sources: [{ ...definition.sources[0], selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b'] } }],
      series: [{ ...definition.series[0], resourceGuid: 'meter-b' }] } as any)];
    const prepared = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(snapshot))));
    await harness.seed({ accounts: [{ guid: 'destination' }] });
    const service = createService();
    const facilities = prepared.facilities.map(facility => ({ selectedFacility: facility, backup: preparation.extractFacility(prepared, facility.guid) }));
    const selections = Object.fromEntries(facilities.map(item => [item.selectedFacility.name, { importAs: 'new' as const }]));
    await service.importSelectedFacilities({ guid: 'destination' } as any, facilities, selections, []);
    const restored = await readSnapshot('destination');
    const decoded = readSavedVisualization(restored.savedVisualizations[0]);
    expect(decoded.state).toBe('repair-required');
    expect(restored.savedVisualizations[0].preservation.references.map(ref => ref.reason)).toEqual(['foreign', 'foreign']);
    const intent = restored.savedVisualizations[0].definition as ReturnType<typeof utilityVisualizationFixture>;
    expect(intent.series[0].resourceGuid).toBe(restored.meters.find(item => item.facilityId !== savedVisualizationFacilityGuid(restored.savedVisualizations[0], restored.facilities)).guid);
    expect(service.visualizationImportSummary()).toMatchObject({ repairRequired: 1 });
  });

  it('completely replaces a facility from an older backup without deleting portfolio or foreign-account charts', async () => {
    const snapshot = visualizationBackupSnapshot();
    const oldFacility = snapshot.facilities[0];
    const backup = builder.buildFacilityBackup(snapshot, oldFacility.guid);
    delete backup.savedVisualizations;
    const prepared = preparation.prepare(JSON.parse(JSON.stringify(backup)));
    const foreign = { ...savedVisualizationFixture(utilityVisualizationFixture(), 'foreign-chart'), accountId: 'foreign-account',
      definition: { ...utilityVisualizationFixture(), accountGuid: 'foreign-account' } };
    await harness.seed({ accounts: [{ ...snapshot.account }, { guid: 'foreign-account' }], facilities: snapshot.facilities.map(item => ({ ...item })),
      savedVisualizations: [...snapshot.savedVisualizations.map(item => ({ ...item })), { ...foreign }] });
    const before = await harness.getAll('savedVisualizations');
    const service = createService(), original = IndexedDbTransactionContext.prototype.add;
    const failure = vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function (store, value) {
      return store === 'utilityMeter' ? Promise.reject(new Error('Replacement failed')) : original.call(this, store, value);
    });
    await expect(service.replaceFacilityBackupFile(prepared, snapshot.account.guid, { ...oldFacility, id: 1 }, 0)).rejects.toThrow('Replacement failed');
    expect(await harness.getAll('savedVisualizations')).toEqual(before);
    failure.mockRestore();
    await service.replaceFacilityBackupFile(prepared, snapshot.account.guid, { ...oldFacility, id: 1 }, 0);
    await harness.reopen();
    const retained = await harness.getAll('savedVisualizations');
    const portfolio = snapshot.savedVisualizations.find(item => savedVisualizationFacilityGuid(item, snapshot.facilities) === undefined)!;
    expect(retained.map(item => item.guid)).toEqual([portfolio.guid, foreign.guid]);
    expect(retained[0].definition).toEqual(portfolio.definition);
    expect(service.visualizationImportSummary()).toMatchObject({ total: 0, locked: 0, repairRequired: 0 });
  });

  it('rolls back source records when a saved-definition write fails and allows a clean retry', async () => {
    const backup = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(visualizationBackupSnapshot()))));
    const service = createService(), original = IndexedDbTransactionContext.prototype.add;
    const failure = vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function(store, value) {
      return store === 'savedVisualizations' ? Promise.reject(new Error('Definition write failed')) : original.call(this, store, value);
    });
    await expect(service.importAccountBackupFile(backup, 0)).rejects.toThrow('Definition write failed');
    for (const store of ['accounts', 'facilities', 'utilityMeter', 'analysisItems', 'savedVisualizations'] as const) expect(await harness.getAll(store)).toEqual([]);
    expect(service.visualizationImportSummary()).toBeUndefined();
    failure.mockRestore();
    const account = await service.importAccountBackupFile(backup, 0);
    await harness.reopen();
    expect((await readSnapshot(account.guid)).savedVisualizations).toHaveLength(8);
  });

  function createService(): BackupImportCommandService {
    const loading = { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as unknown as LoadingService;
    return new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }), loading);
  }

  async function readSnapshot(accountGuid: string): Promise<AccountWorkspaceSnapshot> {
    const byOwner = async (store: string) => (await harness.getAll<any>(store)).filter(item => item.accountId === accountGuid);
    return { homeDashboards: [], homeOwners: [],
      account: (await harness.getAll<any>('accounts')).find(item => item.guid === accountGuid),
      facilities: await byOwner('facilities'), meters: await byOwner('utilityMeter'), meterGroups: await byOwner('utilityMeterGroups'),
      predictors: await byOwner('predictor'), facilityAnalyses: await byOwner('analysisItems'), accountAnalyses: await byOwner('accountAnalysisItems'),
      energyUseGroups: await byOwner('facilityEnergyUseGroups'), energyUseEquipment: await byOwner('facilityEnergyUseEquipment'),
      savedVisualizations: await byOwner('savedVisualizations') as IdbSavedVisualization[],
      meterData: [], predictorData: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: []
    };
  }
});
