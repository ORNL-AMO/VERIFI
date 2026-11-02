import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';

interface OrderDraft {
  readonly accountGuid: string;
  readonly facilityGuids: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class PortfolioFacilityOrderService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly commandHandler = inject(AccountCommandHandler);
  private readonly draft = signal<OrderDraft | undefined>(undefined);
  private readonly savingAccount = signal<string | undefined>(undefined);
  private readonly errorAccount = signal<string | undefined>(undefined);
  private readonly savedAccount = signal<string | undefined>(undefined);
  private pending: Promise<void> = Promise.resolve();

  readonly facilities = computed(() => {
    const account = this.accountWorkspaceStore.account();
    const draft = this.draft();
    return orderFacilities(this.accountWorkspaceStore.facilities(), draft?.accountGuid === account?.guid ? draft?.facilityGuids : account?.portfolioFacilityOrder);
  });
  readonly saving = computed(() => !!this.savingAccount() && this.savingAccount() === this.accountWorkspaceStore.account()?.guid);
  readonly error = computed(() => !!this.errorAccount() && this.errorAccount() === this.accountWorkspaceStore.account()?.guid);
  readonly saved = computed(() => !!this.savedAccount() && this.savedAccount() === this.accountWorkspaceStore.account()?.guid);

  constructor() {
    effect(() => {
      const accountGuid = this.accountWorkspaceStore.account()?.guid;
      const draft = this.draft();
      if (draft && draft.accountGuid !== accountGuid) this.draft.set(undefined);
      if (this.errorAccount() !== accountGuid) this.errorAccount.set(undefined);
      if (this.savedAccount() !== accountGuid) this.savedAccount.set(undefined);
    });
    const unregister = inject(UnsavedChangesService).register(
      () => !!this.draft(),
      () => { this.draft.set(undefined); this.errorAccount.set(undefined); },
      () => this.saving(),
      async () => {
        do {
          await this.pending;
        } while (this.savingAccount());
        return !this.draft();
      }
    );
    inject(DestroyRef).onDestroy(unregister);
  }

  move(facilityGuid: string, destinationIndex: number): void {
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const facilities = this.facilities();
    const sourceIndex = facilities.findIndex(facility => facility.guid === facilityGuid);
    if (!accountGuid || facilities.length < 2 || sourceIndex < 0 || !Number.isInteger(destinationIndex) || destinationIndex < 0 || destinationIndex >= facilities.length)
      return;
    if (sourceIndex === destinationIndex) {
      if (this.error()) this.startSave();
      return;
    }
    const [facility] = facilities.splice(sourceIndex, 1);
    facilities.splice(destinationIndex, 0, facility);
    this.draft.set({ accountGuid, facilityGuids: facilities.map(item => item.guid) });
    this.errorAccount.set(undefined);
    this.savedAccount.set(undefined);
    this.startSave();
  }

  private startSave(): void {
    const draft = this.draft();
    if (!draft || draft.accountGuid !== this.accountWorkspaceStore.account()?.guid || this.savingAccount())
      return;
    this.savingAccount.set(draft.accountGuid);
    this.errorAccount.set(undefined);
    this.pending = this.save(draft.accountGuid);
  }

  private async save(accountGuid: string): Promise<void> {
    try {
      while (this.draft()?.accountGuid === accountGuid && this.accountWorkspaceStore.account()?.guid === accountGuid) {
        const draft = this.draft()!;
        await this.commandBoundary.execute({
          entityKind: 'account', changeKind: 'update', entityGuid: accountGuid,
          label: 'Saving facility order', notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: account => ({ account }) }
        }, async () => {
          const account = this.accountWorkspaceStore.account();
          if (account?.guid !== accountGuid)
            throw new WorkspaceWriteError('stale-workspace', 'The active account changed.');

          return this.commandHandler.update({
            ...structuredClone(account),
            portfolioFacilityOrder: orderFacilities(this.accountWorkspaceStore.facilities(), draft.facilityGuids).map(item => item.guid)
          }, accountGuid);
        });
        if (this.draft() === draft) this.draft.set(undefined);
        if (this.accountWorkspaceStore.account()?.guid === accountGuid) this.savedAccount.set(accountGuid);
      }
    } catch {
      if (this.accountWorkspaceStore.account()?.guid === accountGuid) this.errorAccount.set(accountGuid);
    } finally {
      this.savingAccount.set(undefined);
      if (this.draft() && this.draft()!.accountGuid !== accountGuid) this.startSave();
    }
  }
}
