import { vi } from 'vitest';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness, IndexedDbTestRecord } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { EnergyFootprintAnnualBalanceMeterGroup } from '@domain/calculations/energy-footprint/energyBalance/energyFootprintAnnualBalanceMeterGroup';
import { buildEnergyUseInventory } from '@app/v1/data/energy-uses/inventory/energy-use-inventory.models';
import { buildEnergyUseGroups } from '@app/v1/data/energy-uses/inventory/energy-use-group.models';
import { BackupImportCommandService } from './backup-import-command.service';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';

describe('Energy-use backup relationships in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const builder = new WorkspaceBackupSnapshotBuilder();
  const preparation = new BackupPreparationService();

  beforeEach(async () => { harness = await IndexedDbTestHarness.create('energy-use-backup-roundtrip'); });
  afterEach(async () => { await harness.destroy(); });

  it.each(['Account', 'Facility'] as const)('round trips %s backups with unresolved and valid group references', async kind => {
    const source = energyUseSnapshot();
    await harness.seed({ accounts: [{ ...source.account }], facilities: source.facilities.map(item => ({ ...item })),
      utilityMeterGroups: source.meterGroups.map(item => ({ ...item })),
      facilityEnergyUseGroups: source.energyUseGroups.map(item => ({ ...item })),
      facilityEnergyUseEquipment: source.energyUseEquipment.map(item => ({ ...item })) });
    const original = await readSnapshot(source.account.guid);
    const exported = kind === 'Account' ? builder.buildAccountBackup(original) : builder.buildFacilityBackup(original, source.facilities[0].guid);
    const prepared = preparation.prepare(JSON.parse(JSON.stringify(exported)));
    const before = structuredClone(prepared);
    const service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(prepared, 0)).guid;
    else {
      const target = { ...getNewIdbAccount(), guid: 'destination-account' };
      await harness.seed({ accounts: [target] });
      accountGuid = target.guid;
      await service.importFacilityBackupFile(prepared, accountGuid, 0);
    }
    await harness.reopen();
    const restored = await readSnapshot(accountGuid);
    const facility = restored.facilities[0], energyGroup = restored.energyUseGroups[0], meterGroup = restored.meterGroups[0];
    expect(restored.energyUseEquipment).toHaveLength(2);
    expect(restored.energyUseGroups).toHaveLength(1);
    expect(restored.meterGroups).toHaveLength(1);
    expect(energyGroup.guid).not.toBe('saved-energy-group');
    expect(meterGroup.guid).not.toBe('saved-meter-group');
    for (const input of prepared.facilityEnergyUseEquipment) {
      const saved = restored.energyUseEquipment.find(item => item.name === input.name)!;
      expect(saved).toEqual({ ...input, id: saved.id, guid: saved.guid, accountId: accountGuid, facilityId: facility.guid,
        energyUseGroupId: input.name === 'Orphaned equipment' ? 'missing-energy-group' : energyGroup.guid,
        utilityMeterGroupIds: input.name === 'Orphaned equipment' ? [meterGroup.guid, 'missing-meter-group'] : [meterGroup.guid] });
    }
    const entries = buildEnergyUseInventory(accountGuid, restored.facilities, restored.energyUseEquipment, restored.energyUseGroups, restored.meterGroups);
    const orphan = entries.find(entry => entry.name === 'Orphaned equipment')!;
    expect(orphan.snapshot.group).toBe('Group unavailable');
    expect(orphan.snapshot.meterGroups).toContainEqual({ guid: 'missing-meter-group', label: 'Meter group unavailable' });
    expect(buildEnergyUseGroups(accountGuid, restored.facilities, restored.energyUseGroups, entries)
      .find(group => group.unavailable)?.items.map(item => item.guid)).toEqual([orphan.guid]);
    const nextBackup = kind === 'Account' ? builder.buildAccountBackup(restored) : builder.buildFacilityBackup(restored, facility.guid);
    expect(preparation.prepare(JSON.parse(JSON.stringify(nextBackup))).facilityEnergyUseEquipment).toEqual(JSON.parse(JSON.stringify(restored.energyUseEquipment)));
    expect(prepared).toEqual(before);
    expect(await readSnapshot(source.account.guid)).toEqual(original);
  });

  it.each([
    { kind: 'Account', links: null }, { kind: 'Account', links: undefined },
    { kind: 'Facility', links: null }, { kind: 'Facility', links: undefined }
  ] as const)('restores $kind backups with optional meter links $links as usable empty arrays', async ({ kind, links }) => {
    const initial = energyUseSnapshot();
    const source = { ...initial, energyUseEquipment: initial.energyUseEquipment.map(item => ({ ...item, utilityMeterGroupIds: links })) };
    const exported = kind === 'Account' ? builder.buildAccountBackup(source) : builder.buildFacilityBackup(source, source.facilities[0].guid);
    const before = structuredClone(exported);
    const prepared = preparation.prepare(exported);
    const service = createService();
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(prepared, 0)).guid;
    else {
      const account = { ...getNewIdbAccount(), guid: 'destination-account' };
      await harness.seed({ accounts: [account] });
      accountGuid = account.guid;
      await service.importFacilityBackupFile(prepared, accountGuid, 0);
    }

    await harness.reopen();
    const restored = await readSnapshot(accountGuid);
    expect(restored.energyUseEquipment).toHaveLength(2);
    for (const item of restored.energyUseEquipment) {
      expect(item.utilityMeterGroupIds).toEqual([]);
      const original = source.energyUseEquipment.find(saved => saved.name === item.name)!;
      expect(item.utilityData).toEqual(original.utilityData);
      expect(item.operatingConditionsData).toEqual(original.operatingConditionsData);
      expect(item.noLongerInUse).toEqual(original.noLongerInUse);
    }
    // This shared legacy calculation reads the imported array with .includes().
    expect(() => new EnergyFootprintAnnualBalanceMeterGroup([...restored.energyUseGroups], [...restored.energyUseEquipment], [],
      restored.meterGroups[0], 2024, restored.facilities[0], false)).not.toThrow();
    expect(exported).toEqual(before);
  });

  it.each([
    ['Account', 'facilityEnergyUseGroups'], ['Account', 'utilityMeterGroups'],
    ['Facility', 'facilityEnergyUseGroups'], ['Facility', 'utilityMeterGroups']
  ] as const)('rejects %s restore when an unresolved reference collides with a stored %s group', async (kind, store) => {
    const source = energyUseSnapshot(), target = { ...getNewIdbAccount(), guid: 'destination-account' };
    const targetFacility = { ...getNewIdbFacility(target), guid: 'destination-facility' };
    const collision = store === 'facilityEnergyUseGroups'
      ? { ...getNewIdbFacilityEnergyUseGroup(target.guid, targetFacility.guid), guid: 'missing-energy-group' }
      : { ...getNewIdbUtilityMeterGroup('Energy', 'Existing group', targetFacility.guid, target.guid), guid: 'missing-meter-group' };
    await harness.seed({ accounts: [target], facilities: [targetFacility], [store]: [collision] });
    const prepared = preparation.prepare(kind === 'Account' ? builder.buildAccountBackup(source) : builder.buildFacilityBackup(source, source.facilities[0].guid));
    const before = await readSnapshot(target.guid);

    await expect(kind === 'Account' ? createService().importAccountBackupFile(prepared, 0)
      : createService().importFacilityBackupFile(prepared, target.guid, 0)).rejects.toThrow('unavailable group reference');

    await harness.reopen();
    expect(await readSnapshot(target.guid)).toEqual(before);
    expect(await harness.getAll('accounts')).toHaveLength(1);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
  });

  function createService(): BackupImportCommandService {
    const loading: Pick<LoadingService, 'setCurrentLoadingIndex' | 'setLoadingMessage'> = {
      setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn()
    };
    return new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: { ...dbConfig, name: harness.databaseName }
    }), loading as LoadingService);
  }

  async function readSnapshot(accountGuid: string): Promise<AccountWorkspaceSnapshot> {
    const [accounts, facilities, meterGroups, energyUseGroups, energyUseEquipment] = await Promise.all([
      harness.getAll<IdbAccount & IndexedDbTestRecord>('accounts'),
      harness.getAll<IdbFacility & IndexedDbTestRecord>('facilities'),
      harness.getAll<IdbUtilityMeterGroup & IndexedDbTestRecord>('utilityMeterGroups'),
      harness.getAll<IdbFacilityEnergyUseGroup & IndexedDbTestRecord>('facilityEnergyUseGroups'),
      harness.getAll<IdbFacilityEnergyUseEquipment & IndexedDbTestRecord>('facilityEnergyUseEquipment')
    ]);
    const owned = <T extends { accountId: string }>(items: T[]) => items.filter(item => item.accountId === accountGuid);
    return { account: accounts.find(item => item.guid === accountGuid), facilities: owned(facilities), meterGroups: owned(meterGroups),
      energyUseGroups: owned(energyUseGroups), energyUseEquipment: owned(energyUseEquipment),
      meters: [], meterData: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [],
      accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [] };
  }
});

function energyUseSnapshot(): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), guid: 'source-account' };
  const facility = { ...getNewIdbFacility(account), guid: 'source-facility' };
  const energyGroup = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), guid: 'saved-energy-group', name: 'Saved group' };
  const meterGroup = { ...getNewIdbUtilityMeterGroup('Energy', 'Saved meter group', facility.guid, account.guid), guid: 'saved-meter-group' };
  const equipment = { ...getNewIdbFacilityEnergyUseEquipment(energyGroup, 2024), guid: 'saved-equipment', name: 'Linked equipment',
    notes: 'Preserve all saved annual data', utilityMeterGroupIds: [meterGroup.guid],
    utilityData: [{ energySource: 'Electricity' as const, size: 4, units: 'kW', numberOfEquipment: 2,
      energyUse: [{ year: 2024, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'kWh' },
        { year: 2025, energyUse: 123.456, overrideEnergyUse: false, energyUseUnit: 'GJ' }] }],
    noLongerInUse: { isNoLongerInUse: true, year: 2025 } };
  const orphan = { ...structuredClone(equipment), guid: 'orphaned-equipment', name: 'Orphaned equipment',
    energyUseGroupId: 'missing-energy-group', utilityMeterGroupIds: [meterGroup.guid, 'missing-meter-group'] };
  return { account, facilities: [facility], meterGroups: [meterGroup], energyUseGroups: [energyGroup], energyUseEquipment: [equipment, orphan],
    meters: [], meterData: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [] };
}
