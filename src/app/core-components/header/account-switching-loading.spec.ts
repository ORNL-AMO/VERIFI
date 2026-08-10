import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { Injector, NgModule, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { IdbAccount } from '../../models/idbModels/account';
import { OrderByPipe } from '../../shared/helper-pipes/order-by.pipe';
import { HeaderComponent } from './header.component';
import { ManageAccountsComponent } from '../manage-accounts/manage-accounts.component';

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [HeaderComponent, ManageAccountsComponent, OrderByPipe],
  schemas: [NO_ERRORS_SCHEMA]
})
class AccountSwitchingLoadingTestModule { }

describe('account switching loading ownership', () => {
  const account = { guid: 'account-b', name: 'Account B' } as IdbAccount;
  const activeAccount = { guid: 'account-a', name: 'Account A' } as IdbAccount;

  it('switches from the header through workspace state without opening legacy loading', async () => {
    const router = {
      url: '/data-evaluation/account',
      events: of(),
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };
    const loading = {
      setLoadingMessage: vi.fn(),
      setLoadingStatus: vi.fn()
    };
    const workspace = { selectAccount: vi.fn().mockResolvedValue('published') };
    const backupExportCoordinator = { exportActiveAccount: vi.fn() };
    const electron = {
      isElectron: false,
      accountLatestBackupFile: { next: vi.fn() }
    };
    const automaticBackups = {};
    const header = new HeaderComponent(
      router as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      backupExportCoordinator as any,
      loading as any,
      workspace as any,
      electron as any,
      { showToast: vi.fn() } as any,
      { detectChanges: vi.fn() } as any,
      automaticBackups as any,
      { resetAndRestart: vi.fn() } as any,
      { accountCatalog: signal([account]) } as any,
      { account: signal(activeAccount), selectedFacility: signal(undefined), isSwitching: signal(false) } as any,
      { execute: vi.fn().mockResolvedValue({ value: {}, change: {} }) } as any,
      { update: vi.fn() } as any,
      TestBed.inject(Injector)
    );
    header.ngOnInit();
    TestBed.tick();
    header.inDataEvaluation = true;

    await header.switchAccount(account);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(loading.setLoadingMessage).not.toHaveBeenCalled();
    expect(loading.setLoadingStatus).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account');
    expect(header.accountList).toEqual([account]);
    expect(header.activeAccount).toEqual(activeAccount);
    header.ngOnDestroy();
  });

  it('uses the requested account guid for first-click data-management navigation', async () => {
    const router = {
      url: '/data-management/account-a/weather-data',
      events: of(),
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };
    const workspace = { selectAccount: vi.fn().mockResolvedValue('published') };
    const header = new HeaderComponent(
      router as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { exportActiveAccount: vi.fn() } as any,
      { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } as any,
      workspace as any,
      { isElectron: false, accountLatestBackupFile: { next: vi.fn() } } as any,
      { showToast: vi.fn() } as any,
      { detectChanges: vi.fn() } as any,
      {} as any,
      { resetAndRestart: vi.fn() } as any,
      { accountCatalog: signal([activeAccount, account]) } as any,
      { account: signal(activeAccount), selectedFacility: signal(undefined), isSwitching: signal(false) } as any,
      { execute: vi.fn().mockResolvedValue({ value: {}, change: {} }) } as any,
      { update: vi.fn() } as any,
      TestBed.inject(Injector)
    );
    header.ngOnInit();
    TestBed.tick();
    header.inDataEvaluation = false;

    await header.switchAccount(account);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-management/account-b/weather-data');
    header.ngOnDestroy();
  });

  it('does not navigate when a header account switch is superseded', async () => {
    const router = {
      url: '/data-management/account-a',
      events: of(),
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };
    const workspace = { selectAccount: vi.fn().mockResolvedValue('superseded') };
    const header = new HeaderComponent(
      router as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { exportActiveAccount: vi.fn() } as any,
      { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } as any,
      workspace as any,
      { isElectron: false, accountLatestBackupFile: { next: vi.fn() } } as any,
      { showToast: vi.fn() } as any,
      { detectChanges: vi.fn() } as any,
      {} as any,
      { resetAndRestart: vi.fn() } as any,
      { accountCatalog: signal([activeAccount, account]) } as any,
      { account: signal(activeAccount), selectedFacility: signal(undefined), isSwitching: signal(false) } as any,
      { execute: vi.fn().mockResolvedValue({ value: {}, change: {} }) } as any,
      { update: vi.fn() } as any,
      TestBed.inject(Injector)
    );
    header.ngOnInit();
    TestBed.tick();

    await header.switchAccount(account);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    header.ngOnDestroy();
  });

  it('switches from account management without opening legacy loading', async () => {
    const router = { navigateByUrl: vi.fn() };
    const loading = {
      setLoadingMessage: vi.fn(),
      setLoadingStatus: vi.fn(),
      navigationAfterLoading: { subscribe: vi.fn() }
    };
    const workspace = { selectAccount: vi.fn().mockResolvedValue('published') };
    const manageAccounts = new ManageAccountsComponent(
      {} as any,
      loading as any,
      {} as any,  // commandBoundary
      {} as any,  // accountHandler
      router as any,
      { showToast: vi.fn() } as any,
      {} as any,
      {} as any,
      workspace as any,
      {} as any,
      { resetAndRestart: vi.fn() } as any,
      {} as any
    );
    manageAccounts.accountErrors = [undefined];

    await manageAccounts.goToAccount(account, 0);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(loading.setLoadingMessage).not.toHaveBeenCalled();
    expect(loading.setLoadingStatus).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account/home');
  });

  it('records inactive-account backup timestamps without publishing a workspace command', async () => {
    const events: string[] = [];
    const workspace = {
      selectAccount: vi.fn(async () => { events.push('workspace'); return 'published'; })
    };
    const backupExportCoordinator = {
      exportAccountByGuid: vi.fn(async () => events.push('backup'))
    };
    const accountHandler = {
      update: vi.fn(async (updatedAccount: IdbAccount) => {
        events.push('catalog-update');
        return updatedAccount;
      })
    };
    const exportService = {
      setExportFacilityDataMessages: vi.fn(),
      exportFacilityData: vi.fn(() => events.push('export'))
    };
    const commandBoundary = {
      execute: vi.fn(async (_opts: any, persist: () => Promise<any>) => {
        events.push('account-update');
        await persist();
        return { value: {}, change: {} };
      })
    };
    const lifecycle = {
      refreshAccountCatalog: vi.fn().mockResolvedValue([account])
    };
    const manageAccounts = createManageAccounts({
      accountHandler,
      workspace,
      backupExportCoordinator,
      exportService,
      commandBoundary,
      lifecycle
    });

    await manageAccounts.backupAccount(account);
    expect(events).toEqual(['backup', 'catalog-update']);
    expect(backupExportCoordinator.exportAccountByGuid).toHaveBeenCalledWith('account-b');
    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(accountHandler.update).toHaveBeenCalledWith(expect.objectContaining({
      guid: 'account-b',
      lastBackup: expect.any(Date)
    }), 'account-b');

    events.length = 0;
    await manageAccounts.exportToExcel(account);
    expect(events).toEqual(['workspace', 'export']);
  });

  it('refreshes the catalog and publishes a new account before navigating to it', async () => {
    const events: string[] = [];
    const createdAccount = { id: 3, guid: 'account-c', name: 'Account C' } as IdbAccount;
    const router = { navigateByUrl: vi.fn(() => events.push('navigate')) };
    const workspace = {
      selectAccount: vi.fn(async (_guid: string) => {
        events.push('workspace');
        return 'published';
      })
    };
    const lifecycle = {
      activatePersistedAccount: vi.fn(async (guid: string) => {
        events.push('catalog');
        await workspace.selectAccount(guid);
      }),
      createAccount: vi.fn(async () => {
        events.push('catalog');
        await workspace.selectAccount(createdAccount.guid);
        return createdAccount;
      })
    };
    const manageAccounts = createManageAccounts({
      accountDb: {
        allAccounts: new BehaviorSubject<IdbAccount[]>([])
      },
      router,
      workspace,
      lifecycle
    });

    await manageAccounts.addNewAccount();

    expect(events).toEqual(['catalog', 'workspace', 'navigate']);
    expect(lifecycle.createAccount).toHaveBeenCalled();
    expect(workspace.selectAccount).toHaveBeenCalledWith('account-c');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-management/account-c');
  });
});

function createManageAccounts(overrides: Record<string, any> = {}): ManageAccountsComponent {
  const accountDb = overrides.accountDb ?? {
    allAccounts: new BehaviorSubject<IdbAccount[]>([]),
    updateWithObservable: vi.fn(() => of({}))
  };
    const loading = overrides.loading ?? {
      setLoadingMessage: vi.fn(),
      setLoadingStatus: vi.fn(),
      setContext: vi.fn(),
    setTitle: vi.fn(),
    setCurrentLoadingIndex: vi.fn(),
    clearLoadingMessages: vi.fn(),
    navigationAfterLoading: new BehaviorSubject<string | undefined>(undefined)
  };
  return new ManageAccountsComponent(
    accountDb as any,
    loading as any,
    (overrides.commandBoundary ?? { execute: vi.fn().mockResolvedValue({ value: {}, change: {} }) }) as any,
    (overrides.accountHandler ?? { update: vi.fn(), add: vi.fn().mockImplementation(a => Promise.resolve({ ...a, id: 99, guid: 'new-guid' })) }) as any,
    (overrides.router ?? { navigateByUrl: vi.fn() }) as any,
    (overrides.toasts ?? { showToast: vi.fn() }) as any,
    (overrides.backupExportCoordinator ?? { exportAccountByGuid: vi.fn(), exportActiveAccount: vi.fn() }) as any,
    (overrides.exportService ?? {
      setExportFacilityDataMessages: vi.fn(),
      exportFacilityData: vi.fn()
    }) as any,
    (overrides.workspace ?? { selectAccount: vi.fn().mockResolvedValue('published') }) as any,
    (overrides.lifecycle ?? {
      activatePersistedAccount: vi.fn().mockResolvedValue(undefined),
      createAccount: vi.fn().mockImplementation(async () => ({ id: 99, guid: 'new-guid' })),
      refreshAccountCatalog: vi.fn().mockResolvedValue([])
    }) as any,
    (overrides.databaseReset ?? { resetAndRestart: vi.fn() }) as any,
    {} as any
  );
}
