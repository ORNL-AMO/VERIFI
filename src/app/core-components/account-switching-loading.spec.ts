import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
      { selectedFacility: { getValue: vi.fn() } } as any,
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
      automaticBackups as any
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
      workspace as any
    );
    manageAccounts.accountErrors = [undefined];

    await manageAccounts.goToAccount(account, 0);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(loading.setLoadingMessage).not.toHaveBeenCalled();
    expect(loading.setLoadingStatus).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account/home');
  });
});
