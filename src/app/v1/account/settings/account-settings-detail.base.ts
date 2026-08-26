import { Directive, OnDestroy, inject } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccount } from '@data/models/idbModels/account';

export type AccountSettingsDetail = 'profile' | 'units' | 'goals' | 'financial' | 'staleness' | 'backup';
export type AccountSettingsSaveState = 'idle' | 'saving' | 'saved' | 'error';

export const ACCOUNT_SETTINGS_DETAILS: ReadonlyArray<AccountSettingsDetail> = [
  'profile',
  'units',
  'goals',
  'financial',
  'staleness',
  'backup'
];

const SAVE_DEBOUNCE_MS = 600;

@Directive()
export abstract class AccountSettingsDetailBase implements OnDestroy {
  protected readonly workspace = inject(AccountWorkspaceStore);
  protected readonly commandBoundary = inject(WorkspaceCommandBoundary);
  protected readonly accountHandler = inject(AccountCommandHandler);
  protected readonly lifecycle = inject(ApplicationLifecycleService);

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;

  saveState: AccountSettingsSaveState = 'idle';
  saveMessage = '';
  saveError = '';

  protected skipNextWorkspaceRefresh = false;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    this.clearDebounce();
    this.clearIdleTimer();
  }

  protected scheduleSave(save: () => Promise<void>): void {
    this.clearDebounce();
    this.debounceTimer = setTimeout(() => {
      void save();
    }, SAVE_DEBOUNCE_MS);
  }

  protected flushSave(save: () => Promise<void>): void {
    if (!this.debounceTimer) {
      return;
    }
    this.clearDebounce();
    void save();
  }

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
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update({ ...updatedAccount }, updatedAccount.guid)
      );
      await this.lifecycle.refreshAccountCatalog();
    });
  }

  protected async runSave(label: string, save: () => Promise<void>): Promise<void> {
    this.clearIdleTimer();
    this.saveState = 'saving';
    this.saveError = '';
    this.saveMessage = label;
    try {
      this.skipNextWorkspaceRefresh = true;
      await save();
      this.saveMessage = 'Saved';
      this.saveState = 'saved';
      this.idleTimer = setTimeout(() => {
        this.saveState = 'idle';
      }, 2500);
    } catch (error) {
      this.skipNextWorkspaceRefresh = false;
      this.saveMessage = '';
      this.saveError = 'Changes could not be saved. Please try again.';
      this.saveState = 'error';
      console.warn('v1 account settings save failed.', error);
    }
  }

  protected setFormEnabled(form: FormGroup | undefined, enabled: boolean): void {
    if (!form) {
      return;
    }
    if (enabled && form.disabled) {
      form.enable({ emitEvent: false });
    } else if (!enabled && form.enabled) {
      form.disable({ emitEvent: false });
    }
  }

  protected setControlEnabled(control: AbstractControl | undefined, enabled: boolean): void {
    if (!control) {
      return;
    }
    if (enabled && control.disabled) {
      control.enable({ emitEvent: false });
    } else if (!enabled && control.enabled) {
      control.disable({ emitEvent: false });
    }
  }

  protected setControlsEnabled(form: FormGroup | undefined, controlNames: string[], enabled: boolean): void {
    controlNames.forEach(controlName => this.setControlEnabled(form?.controls[controlName], enabled));
  }

  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }
}
