import { vi } from 'vitest';
import { AccountWorkspaceLoaderService } from './account-workspace-loader.service';
import { AccountWorkspaceSnapshot } from './account-workspace.models';
import { AccountWorkspaceService } from './account-workspace.service';
import { AccountWorkspaceStore } from './account-workspace.store';

describe('AccountWorkspaceLoaderService', () => {
  it('sorts every collection and rejects cross-account records', async () => {
    const repositories = createRepositories();
    repositories.facilities.getAllAccountFacilities.mockResolvedValue([
      { id: 2, guid: 'facility-b', accountId: 'account-a' },
      { id: 1, guid: 'facility-a', accountId: 'account-a' }
    ]);
    const loader = createLoader(repositories);

    const snapshot = await loader.load('account-a');

    expect(snapshot.facilities.map(item => item.guid)).toEqual(['facility-a', 'facility-b']);

    repositories.meters.getAllAccountMeters.mockResolvedValue([
      { id: 1, guid: 'meter-b', accountId: 'account-b' }
    ]);
    await expect(loader.load('account-a')).rejects.toThrow('meters query returned data belonging to another account');
  });

  it('starts independent collection queries before waiting for their results', async () => {
    const repositories = createRepositories();
    const facilities = deferred<any[]>();
    repositories.facilities.getAllAccountFacilities.mockReturnValue(facilities.promise);
    const loader = createLoader(repositories);

    const load = loader.load('account-a');
    await Promise.resolve();

    expect(repositories.facilities.getAllAccountFacilities).toHaveBeenCalled();
    expect(repositories.meters.getAllAccountMeters).toHaveBeenCalled();
    expect(repositories.energyUseEquipment.getAllAccountEnergyUseEquipment).toHaveBeenCalled();

    facilities.resolve([]);
    await expect(load).resolves.toMatchObject({ account: { guid: 'account-a' } });
  });
});

describe('AccountWorkspaceService', () => {
  it('allows only the newest overlapping account request to publish', async () => {
    const accountA = deferred<AccountWorkspaceSnapshot>();
    const accountB = deferred<AccountWorkspaceSnapshot>();
    const loader = {
      load: vi.fn((guid: string) => guid === 'account-a' ? accountA.promise : accountB.promise)
    };
    const store = new AccountWorkspaceStore();
    const storage = createSelectionStorage();
    const service = new AccountWorkspaceService(loader as any, store, storage as any);

    const first = service.selectAccount('account-a');
    const second = service.selectAccount('account-b');
    accountB.resolve(createSnapshot('account-b', 2));
    await expect(second).resolves.toBe('published');
    accountA.resolve(createSnapshot('account-a', 1));
    await expect(first).resolves.toBe('superseded');

    expect(store.account()?.guid).toBe('account-b');
    expect(storage.storeAccount).toHaveBeenCalledOnce();
    expect(storage.storeAccount).toHaveBeenCalledWith(2);
  });

  it('restores the previous ready workspace when a switch fails', async () => {
    const loader = { load: vi.fn() };
    const store = new AccountWorkspaceStore();
    const storage = createSelectionStorage();
    const service = new AccountWorkspaceService(loader as any, store, storage as any);
    loader.load.mockResolvedValueOnce(createSnapshot('account-a', 1));
    await service.selectAccount('account-a');
    loader.load.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(service.selectAccount('account-b')).rejects.toThrow('storage unavailable');

    expect(store.status()).toBe('ready');
    expect(store.account()?.guid).toBe('account-a');
    expect(store.error()?.accountGuid).toBe('account-b');
    expect(storage.storeAccount).toHaveBeenCalledTimes(1);
  });

  it('persists facility selection only after validating ownership', async () => {
    const loader = { load: vi.fn().mockResolvedValue(createSnapshot('account-a', 1)) };
    const store = new AccountWorkspaceStore();
    const storage = createSelectionStorage();
    const service = new AccountWorkspaceService(loader as any, store, storage as any);
    await service.selectAccount('account-a');

    expect(() => service.selectFacility('foreign-facility')).toThrow('does not belong to the active account');
    expect(storage.storeFacility).not.toHaveBeenCalled();

    service.selectFacility('account-a-facility');
    expect(storage.storeFacility).toHaveBeenCalledWith(11);
    expect(store.selectedFacility()?.guid).toBe('account-a-facility');
  });

  it('increments revision only for a committed reload', async () => {
    const loader = { load: vi.fn().mockResolvedValue(createSnapshot('account-a', 1)) };
    const store = new AccountWorkspaceStore();
    const service = new AccountWorkspaceService(
      loader as any,
      store,
      createSelectionStorage() as any
    );
    await service.selectAccount('account-a');

    await service.reloadActiveWorkspace(false);
    expect(store.revision()).toBe(0);

    await service.reloadActiveWorkspace(true);
    expect(store.committedRevision()).toEqual({ accountGuid: 'account-a', revision: 1 });
  });

  it('rejects foreign meter and predictor selections and clears them with an undefined GUID', async () => {
    const snapshot: AccountWorkspaceSnapshot = {
      ...createSnapshot('account-a', 1),
      meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'account-a-facility' }] as any,
      predictors: [{ guid: 'predictor-a', accountId: 'account-a', facilityId: 'account-a-facility' }] as any
    };
    const loader = { load: vi.fn().mockResolvedValue(snapshot) };
    const store = new AccountWorkspaceStore();
    const service = new AccountWorkspaceService(loader as any, store, createSelectionStorage() as any);
    await service.selectAccount('account-a');
    service.selectFacility('account-a-facility');

    expect(() => service.selectMeter('foreign-meter')).toThrow('does not belong');
    expect(() => service.selectPredictor('foreign-predictor')).toThrow('does not belong');
    service.selectMeter('meter-a');
    service.selectPredictor('predictor-a');
    service.selectMeter(undefined);
    service.selectPredictor(undefined);

    expect(store.selectedMeter()).toBeUndefined();
    expect(store.selectedPredictor()).toBeUndefined();
    expect(store.revision()).toBe(0);
  });
});

function createRepositories() {
  const empty = () => vi.fn().mockResolvedValue([]);
  return {
    accounts: {
      getStoredByGuid: vi.fn().mockResolvedValue({ id: 1, guid: 'account-a', name: 'Account A' })
    },
    facilities: { getAllAccountFacilities: empty() },
    meters: { getAllAccountMeters: empty() },
    meterData: { getAllAccountMeterData: empty() },
    meterGroups: { getAllAccountMeterGroups: empty() },
    predictors: { getAllAccountPredictors: empty() },
    predictorData: { getAllAccountPredictorData: empty() },
    facilityAnalyses: { getAllAccountAnalysisItems: empty() },
    accountAnalyses: { getAllAccountAnalysisItems: empty() },
    accountReports: { getAllAccountReports: empty() },
    facilityReports: { getAllFacilityReportsByAccountId: empty() },
    customEmissions: { getAllAccountCustomEmissions: empty() },
    customFuels: { getAllAccountCustomFuels: empty() },
    customGWPs: { getAllAccountCustomGWP: empty() },
    energyUseGroups: { getAllAccountEnergyUseGroups: empty() },
    energyUseEquipment: { getAllAccountEnergyUseEquipment: empty() }
  };
}

function createLoader(repositories: ReturnType<typeof createRepositories>): AccountWorkspaceLoaderService {
  return new AccountWorkspaceLoaderService(
    repositories.accounts as any,
    repositories.facilities as any,
    repositories.meters as any,
    repositories.meterData as any,
    repositories.meterGroups as any,
    repositories.predictors as any,
    repositories.predictorData as any,
    repositories.facilityAnalyses as any,
    repositories.accountAnalyses as any,
    repositories.accountReports as any,
    repositories.facilityReports as any,
    repositories.customEmissions as any,
    repositories.customFuels as any,
    repositories.customGWPs as any,
    repositories.energyUseGroups as any,
    repositories.energyUseEquipment as any
  );
}

function createSelectionStorage() {
  return {
    read: vi.fn().mockReturnValue({}),
    storeAccount: vi.fn(),
    clearAccount: vi.fn(),
    storeFacility: vi.fn(),
    clearFacility: vi.fn(),
    storeFacilityAnalysis: vi.fn(),
    clearFacilityAnalysis: vi.fn(),
    storeAccountAnalysis: vi.fn(),
    clearAccountAnalysis: vi.fn(),
    storeAccountReport: vi.fn(),
    clearAccountReport: vi.fn(),
    storeFacilityReport: vi.fn(),
    clearFacilityReport: vi.fn()
  };
}

function createSnapshot(accountGuid: string, accountId: number): AccountWorkspaceSnapshot {
  return {
    account: { id: accountId, guid: accountGuid, name: accountGuid } as any,
    facilities: [{ id: 11, guid: `${accountGuid}-facility`, accountId: accountGuid }] as any,
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
