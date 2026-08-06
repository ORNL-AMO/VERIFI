import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { IdbAccount } from '../models/idbModels/account';
import { OrderByPipe } from '../shared/helper-pipes/order-by.pipe';
import { HeaderComponent } from './header/header.component';
import { ManageAccountsComponent } from './manage-accounts/manage-accounts.component';

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [HeaderComponent, ManageAccountsComponent, OrderByPipe],
  schemas: [NO_ERRORS_SCHEMA]
})
class AccountSwitchingLoadingTestModule { }

describe('account switching loading ownership', () => {
  const account = { guid: 'account-b', name: 'Account B' } as IdbAccount;

  it('switches from the header through workspace state without opening legacy loading', async () => {
    const router = {
      url: '/data-evaluation/account',
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };
    const loading = {
      setLoadingMessage: vi.fn(),
      setLoadingStatus: vi.fn()
    };
    const workspace = { selectAccount: vi.fn().mockResolvedValue('published') };
    const electron = {
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
      {} as any,
      loading as any,
      workspace as any,
      electron as any,
      { showToast: vi.fn() } as any,
      { detectChanges: vi.fn() } as any,
      automaticBackups as any,
      { resetAndRestart: vi.fn() } as any,
      { accountCatalog: () => [] } as any,
      { account: () => undefined, selectedFacility: () => undefined } as any
    );
    header.inDataEvaluation = true;

    await header.switchAccount(account);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(loading.setLoadingMessage).not.toHaveBeenCalled();
    expect(loading.setLoadingStatus).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account');
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
      {} as any,
      router as any,
      { showToast: vi.fn() } as any,
      {} as any,
      {} as any,
      workspace as any,
      {} as any,
      { resetAndRestart: vi.fn() } as any
    );
    manageAccounts.accountErrors = [undefined];

    await manageAccounts.goToAccount(account, 0);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(loading.setLoadingMessage).not.toHaveBeenCalled();
    expect(loading.setLoadingStatus).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account/home');
  });

  it('publishes the requested workspace before backing up or exporting an account', async () => {
    const events: string[] = [];
    const workspace = {
      selectAccount: vi.fn(async () => {
        events.push('workspace');
        return 'published';
      })
    };
    const backupData = { backupAccount: vi.fn(() => events.push('backup')) };
    const exportService = {
      setExportFacilityDataMessages: vi.fn(),
      exportFacilityData: vi.fn(() => events.push('export'))
    };
    const dbChanges = {
      updateAccount: vi.fn(async () => events.push('account-update'))
    };
    const lifecycle = {
      refreshAccountCatalog: vi.fn().mockResolvedValue([account])
    };
    const manageAccounts = createManageAccounts({
      workspace,
      backupData,
      exportService,
      dbChanges,
      lifecycle
    });

    await manageAccounts.backupAccount(account);
    expect(events).toEqual(['workspace', 'backup', 'account-update']);
    expect(dbChanges.updateAccount).toHaveBeenCalledWith(expect.objectContaining({
      guid: 'account-b',
      lastBackup: expect.any(Date)
    }));

    events.length = 0;
    await manageAccounts.exportToExcel(account);
    expect(events).toEqual(['workspace', 'export']);
  });

  it('refreshes the catalog and publishes a new account before navigating to it', async () => {
    const events: string[] = [];
    const createdAccount = { id: 3, guid: 'account-c', name: 'Account C' } as IdbAccount;
    const router = { navigateByUrl: vi.fn(() => events.push('navigate')) };
    const workspace = {
      selectAccount: vi.fn(async () => {
        events.push('workspace');
        return 'published';
      })
    };
    const lifecycle = {
      refreshAccountCatalog: vi.fn(async () => {
        events.push('catalog');
        return [createdAccount];
      })
    };
    const manageAccounts = createManageAccounts({
      accountDb: {
        addWithObservable: vi.fn(() => of(createdAccount)),
        allAccounts: new BehaviorSubject<IdbAccount[]>([])
      },
      router,
      workspace,
      lifecycle
    });

    await manageAccounts.addNewAccount();

    expect(events).toEqual(['catalog', 'workspace', 'navigate']);
    expect(workspace.selectAccount).toHaveBeenCalledWith('account-c');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-management/account-c');
  });
});

function createManageAccounts(overrides: Record<string, any> = {}): ManageAccountsComponent {
  const accountDb = overrides.accountDb ?? {
    allAccounts: new BehaviorSubject<IdbAccount[]>([])
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
    (overrides.dbChanges ?? { updateAccount: vi.fn() }) as any,
    (overrides.router ?? { navigateByUrl: vi.fn() }) as any,
    (overrides.toasts ?? { showToast: vi.fn() }) as any,
    (overrides.backupData ?? { backupAccount: vi.fn() }) as any,
    (overrides.exportService ?? {
      setExportFacilityDataMessages: vi.fn(),
      exportFacilityData: vi.fn()
    }) as any,
    (overrides.workspace ?? { selectAccount: vi.fn().mockResolvedValue('published') }) as any,
    (overrides.lifecycle ?? { refreshAccountCatalog: vi.fn().mockResolvedValue([]) }) as any,
    (overrides.databaseReset ?? { resetAndRestart: vi.fn() }) as any
  );
}
