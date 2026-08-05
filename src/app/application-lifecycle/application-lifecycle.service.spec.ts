import { of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from './application-lifecycle.service';

describe('ApplicationLifecycleService', () => {
  it('shares concurrent initialization and follows the required startup order', async () => {
    const order: string[] = [];
    const dependencies = createDependencies(order);
    const lifecycle = createLifecycle(dependencies);

    const first = lifecycle.initialize();
    const second = lifecycle.initialize();

    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({ status: 'ready' });
    expect(order).toEqual([
      'database', 'migrations', 'application-metadata', 'zip-reference-data', 'egrid-reference-data',
      'account-catalog', 'custom-emissions', 'workspace', 'automatic-backups'
    ]);
    expect(lifecycle.persistenceReady()).toBe(true);
    expect(dependencies.selectionStorage.storeAccount).toHaveBeenCalledWith(1);
  });

  it('selects the lowest local account id when the stored selection is invalid', async () => {
    const dependencies = createDependencies([]);
    dependencies.accounts.getAll.mockReturnValue(of([
      { id: 4, guid: 'account-d', name: 'D' },
      { id: 2, guid: 'account-b', name: 'B' },
      { id: 1, guid: 'deleted', name: 'Deleted', deleteAccount: true }
    ]));
    dependencies.selectionStorage.read.mockReturnValue({ accountId: 999 });
    const lifecycle = createLifecycle(dependencies);

    await lifecycle.initialize();

    expect(dependencies.workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(lifecycle.accountCatalog().map(account => account.id)).toEqual([1, 2, 4]);
  });

  it('reaches empty without creating a placeholder account', async () => {
    const dependencies = createDependencies([]);
    dependencies.accounts.getAll.mockReturnValue(of([]));
    const lifecycle = createLifecycle(dependencies);

    await expect(lifecycle.initialize()).resolves.toMatchObject({ status: 'empty' });

    expect(dependencies.workspace.selectAccount).not.toHaveBeenCalled();
    expect(dependencies.workspace.clear).toHaveBeenCalled();
    expect(dependencies.selectionStorage.clearAccount).toHaveBeenCalled();
  });

  it('reports a blocking step error and retries successfully', async () => {
    const dependencies = createDependencies([]);
    dependencies.migrations.runMigrations.mockRejectedValueOnce(new Error('migration failed'));
    const lifecycle = createLifecycle(dependencies);

    await expect(lifecycle.initialize()).resolves.toMatchObject({
      status: 'error',
      error: { step: 'migrations', retryable: true }
    });
    expect(lifecycle.persistenceReady()).toBe(false);

    dependencies.migrations.runMigrations.mockResolvedValue(undefined);
    await expect(lifecycle.retry()).resolves.toMatchObject({ status: 'ready' });
  });

  it('does not block startup when optional automatic backups fail', async () => {
    const dependencies = createDependencies([]);
    dependencies.automaticBackups.subscribeData.mockImplementation(() => {
      throw new Error('optional integration failed');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lifecycle = createLifecycle(dependencies);

    await expect(lifecycle.initialize()).resolves.toMatchObject({ status: 'ready' });
    expect(warn).toHaveBeenCalledWith(
      'Automatic backup observation could not be started.',
      expect.any(Error)
    );
    warn.mockRestore();
  });
});

function createDependencies(order: string[]) {
  const workspaceStore = new AccountWorkspaceStore();
  const snapshot = {
    account: { id: 1, guid: 'account-a', name: 'Account A' },
    facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  } as any;
  const workspace = {
    selectAccount: vi.fn(async (_guid: string) => {
      order.push('workspace');
      workspaceStore.publish(snapshot);
      return 'published';
    }),
    reloadActiveWorkspace: vi.fn().mockResolvedValue('published'),
    clear: vi.fn(() => workspaceStore.clear())
  };
  return {
    transactions: {
      runTransaction: vi.fn(async (_stores, _mode, operation) => {
        order.push('database');
        return operation({ getAll: vi.fn().mockResolvedValue([]) });
      })
    },
    migrations: { runMigrations: vi.fn(async () => { order.push('migrations'); }) },
    applicationInstance: {
      initializeApplicationInstanceData: vi.fn(async () => { order.push('application-metadata'); })
    },
    eGrid: {
      parseZipCodeLongLat: vi.fn(async () => { order.push('zip-reference-data'); }),
      parseEGridData: vi.fn(async () => { order.push('egrid-reference-data'); })
    },
    accounts: {
      getAll: vi.fn(() => {
        order.push('account-catalog');
        return of([{ id: 1, guid: 'account-a', name: 'Account A' }]);
      }),
      updateWithObservable: vi.fn(value => of(value))
    },
    facilities: { updateWithObservable: vi.fn(value => of(value)) },
    customEmissions: {
      getAllAccountCustomEmissions: vi.fn(async () => {
        order.push('custom-emissions');
        return [];
      }),
      deleteWithObservable: vi.fn(() => of(undefined))
    },
    analysisSelectionRepair: {
      repairAccount: vi.fn(account => ({ account, isChanged: false })),
      repairFacility: vi.fn(facility => ({ facility, isChanged: false }))
    },
    workspace,
    workspaceStore,
    selectionStorage: {
      read: vi.fn().mockReturnValue({ accountId: 1 }),
      storeAccount: vi.fn(),
      clearAccount: vi.fn()
    },
    legacyBridge: {
      publishAccountCatalog: vi.fn(),
      clear: vi.fn()
    },
    electron: { isElectron: false },
    electronBackups: { getAll: vi.fn(() => of([])), accountBackups: [] },
    automaticBackups: {
      subscribeData: vi.fn(() => order.push('automatic-backups')),
      initializeAccount: vi.fn()
    }
  };
}

function createLifecycle(dependencies: ReturnType<typeof createDependencies>): ApplicationLifecycleService {
  const originalWorkspaceSelect = dependencies.workspace.selectAccount;
  dependencies.workspace.selectAccount = vi.fn(async (guid: string) => {
    const result = await originalWorkspaceSelect(guid);
    dependencies.selectionStorage.storeAccount(
      dependencies.workspaceStore.account()?.id as number
    );
    return result;
  });
  return new ApplicationLifecycleService(
    dependencies.transactions as any,
    dependencies.migrations as any,
    dependencies.applicationInstance as any,
    dependencies.eGrid as any,
    dependencies.accounts as any,
    dependencies.facilities as any,
    dependencies.customEmissions as any,
    dependencies.analysisSelectionRepair as any,
    dependencies.workspace as any,
    dependencies.workspaceStore,
    dependencies.selectionStorage as any,
    dependencies.legacyBridge as any,
    dependencies.electron as any,
    dependencies.electronBackups as any,
    dependencies.automaticBackups as any
  );
}
