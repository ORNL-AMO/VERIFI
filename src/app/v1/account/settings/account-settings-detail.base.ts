import { Directive, inject } from '@angular/core';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { SettingsDetailBase, SettingsSaveState } from '../../shared/settings/settings-detail.base';

export type AccountSettingsDetail = 'profile' | 'units' | 'goals' | 'financial' | 'staleness' | 'backup' | 'delete';
export type AccountSettingsSaveState = SettingsSaveState;

export const ACCOUNT_SETTINGS_DETAILS: ReadonlyArray<AccountSettingsDetail> = [
  'profile',
  'units',
  'goals',
  'financial',
  'staleness',
  'backup',
  'delete'
];

@Directive()
export abstract class AccountSettingsDetailBase extends SettingsDetailBase {
  protected readonly workspace = inject(AccountWorkspaceStore);
  protected readonly commandBoundary = inject(WorkspaceCommandBoundary);
  protected readonly accountHandler = inject(AccountCommandHandler);
  protected readonly lifecycle = inject(ApplicationLifecycleService);

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;

  protected async saveAccount(label: string, buildAccount: (account: IdbAccount) => IdbAccount): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const updatedAccount = buildAccount(structuredClone(account));
    await this.runSave(label, async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'update',
          entityGuid: updatedAccount.guid,
          label,
          notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update({ ...updatedAccount }, updatedAccount.guid)
      );
      await this.lifecycle.refreshAccountCatalog();
    });
  }

  protected override async runSave(label: string, save: () => Promise<void>): Promise<void> {
    await super.runSave(label, save, 'v1 account settings');
  }
}
