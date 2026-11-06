import { DestroyRef, Injector, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUseBatchRow, reviewEnergyUseBatch } from '../../models/energy-use-batch.models';

export interface GroupMemberSelectionIdentity {
  readonly accountGuid: string | undefined;
  readonly facilityGuid: string | undefined;
  readonly energyUseGroupGuid: string | undefined;
}

/** Setup Group supplies its complete member list, independent of inventory browsing. */
export interface GroupMemberSelectionSource {
  readonly identity: Signal<GroupMemberSelectionIdentity>;
  readonly members: Signal<readonly Readonly<IdbFacilityEnergyUseEquipment>[]>;
}

export class EnergyUseSelectionController {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  readonly selected = signal<readonly string[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly committed = signal(false);
  readonly review = signal<readonly EnergyUseBatchRow[] | undefined>(undefined);
  readonly contextKey = computed(() => {
    const identity = this.source.identity();
    return JSON.stringify([identity.accountGuid, identity.facilityGuid, identity.energyUseGroupGuid]);
  });
  readonly canAct = computed(() => {
    const identity = this.source.identity();
    return !!identity.accountGuid && !!identity.facilityGuid && !!identity.energyUseGroupGuid
      && this.workspace.canWrite() && !this.workspace.hasPending() && !this.busy() && !this.committed();
  });
  readonly stale = computed(() => this.review()?.some(row => !draftEqual(row.item, this.workspace.energyUseEquipment().find(item => item.guid === row.item.guid))
    || !draftEqual(row.facility, this.workspace.facilities().find(facility => facility.guid === row.item.facilityId))) ?? false);
  readonly affected = computed(() => this.review()?.filter(row => !!row.change).length ?? 0);
  readonly canConfirm = computed(() => this.canAct() && !this.stale() && this.affected() > 0 && !this.review()?.some(row => !!row.error));

  constructor(readonly source: GroupMemberSelectionSource) {
    let previous = '';
    effect(() => {
      const key = this.contextKey();
      const busy = this.busy();
      untracked(() => {
        if (previous && previous !== key && !busy) {
          this.clear();
          this.review.set(undefined);
          this.error.set('');
          this.committed.set(false);
        }
        if (!busy) previous = key;
      });
    });
    effect(() => {
      const ids = source.members().map(item => item.guid);
      const ready = this.workspace.isReady();
      if (ready) untracked(() => this.selected.update(selected => selected.filter(guid => ids.includes(guid))));
    });
    registerDataDraft(signal(false), () => {}, computed(() => this.busy() || !!this.review() || this.committed()));
  }

  clear(): void {
    if (!this.busy()) this.selected.set([]);
  }

  select(change: { guid: string; selected: boolean }): void {
    if (!this.canAct() || !this.source.members().some(item => item.guid === change.guid)) return;
    this.selected.update(ids => change.selected ? [...new Set([...ids, change.guid])] : ids.filter(guid => guid !== change.guid));
  }

  selectAll(): void {
    if (this.canAct()) this.selected.set(this.source.members().map(item => item.guid));
  }

  prepareDelete(): void {
    if (!this.canAct() || !this.selected().length) return;
    const ids = new Set(this.selected());
    const identity = this.source.identity();
    const members = new Map(this.source.members().map(item => [item.guid, item]));
    const items = this.workspace.energyUseEquipment().filter(item => ids.has(item.guid)
      && item.accountId === identity.accountGuid && item.facilityId === identity.facilityGuid
      && draftEqual(item, members.get(item.guid)));
    if (items.length !== ids.size) {
      this.error.set('Selected items changed. Select them again.');
      return;
    }
    this.error.set('');
    this.review.set(reviewEnergyUseBatch(items, this.workspace.facilities(), { kind: 'delete' }));
  }

  cancel(): void {
    if (!this.busy() && !this.committed()) {
      this.review.set(undefined);
      this.error.set('');
    }
  }

  async confirm(): Promise<boolean> {
    const rows = this.review();
    const accountGuid = this.source.identity().accountGuid;
    const context = this.contextKey();
    if (!rows || !accountGuid || !this.canConfirm()) return false;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.injector.get(EnergyUseActionsService).applyBatch(accountGuid, rows.map(row => row.change!));
      if (!this.destroy.destroyed && this.contextKey() === context) {
        this.review.set(undefined);
        this.selected.set([]);
      }
      return true;
    } catch (error) {
      if (!this.destroy.destroyed && this.contextKey() === context) {
        this.committed.set(error instanceof WorkspaceWriteError && error.persistenceCommitted);
        this.error.set(this.committed() ? 'Changes were saved, but the workspace could not refresh. Refresh saved changes before continuing.'
          : error instanceof Error ? error.message : 'The batch failed. No records were changed.');
      }
      return false;
    } finally {
      if (!this.destroy.destroyed) this.busy.set(false);
    }
  }

  async recover(): Promise<boolean> {
    const accountGuid = this.source.identity().accountGuid;
    const key = this.contextKey();
    if (!this.committed() || this.busy() || !accountGuid) return false;
    this.busy.set(true);
    try {
      await this.injector.get(EnergyUseActionsService).recoverPublication(accountGuid);
      if (this.destroy.destroyed || key !== this.contextKey()) return false;
      this.committed.set(false);
      this.review.set(undefined);
      this.selected.set([]);
      this.error.set('');
      return true;
    } catch (error) {
      if (!this.destroy.destroyed) this.error.set(error instanceof Error ? error.message : 'Refresh failed. The batch will not be repeated.');
      return false;
    } finally {
      if (!this.destroy.destroyed) this.busy.set(false);
    }
  }
}
