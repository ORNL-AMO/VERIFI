import { DestroyRef, Injector, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUseGroupDeletion } from '@data/account-workspace/handlers/energy-use-command.models';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { EnergyUseGroupEntry } from './energy-use-group.models';

interface GroupDeletionReview {
  readonly accountGuid: string;
  readonly key: string;
  readonly groups: readonly EnergyUseGroupDeletion[];
}

/** Dashboard selection uses facility-qualified card IDs; writes use saved group GUIDs. */
export class EnergyUseGroupSelectionController {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  readonly selecting = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly busy = signal(false);
  readonly committed = signal(false);
  readonly error = signal('');
  readonly review = signal<GroupDeletionReview | undefined>(undefined);
  readonly available = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.busy() && !this.committed());
  readonly canAct = computed(() => this.available() && !this.review());
  readonly selectable = computed(() => Object.fromEntries(this.source.groups().map(group => [group.id, !group.unavailable])));
  readonly canToggle = computed(() => this.canAct() && (this.selecting() || this.source.matching().some(group => !group.unavailable)));
  readonly actionsById = computed<Readonly<Record<string, readonly InventoryTileMenuAction[]>>>(() => Object.fromEntries(
    this.source.groups().map(group => [group.id, group.unavailable ? [] : [{ id: 'delete', label: 'Delete group', icon: 'delete', disabled: !this.canAct() }]])
  ));
  readonly itemCount = computed(() => this.review()?.groups.reduce((count, row) => count + row.items.length, 0) ?? 0);
  readonly stale = computed(() => {
    const review = this.review();
    return !!review && (review.key !== this.source.key() || review.accountGuid !== this.workspace.account()?.guid || review.groups.some(row => {
      const current = this.workspace.energyUseGroups().find(group => group.guid === row.group.guid);
      return !this.workspace.facilities().some(facility => facility.guid === row.group.facilityId && facility.accountId === review.accountGuid) || !draftEqual(row.group, current) || !draftEqual(this.ordered(row.items), this.ordered(this.workspace.energyUseEquipment().filter(item => item.energyUseGroupId === row.group.guid)));
    }));
  });
  readonly canConfirm = computed(() => this.available() && !!this.review() && !this.stale());

  constructor(private readonly source: {
    readonly key: Signal<string>;
    readonly filtersKey: Signal<string>;
    readonly groups: Signal<readonly EnergyUseGroupEntry[]>;
    readonly matching: Signal<readonly EnergyUseGroupEntry[]>;
  }) {
    let previous = '';
    effect(() => {
      const key = JSON.stringify([source.key(), source.filtersKey()]);
      const ready = this.workspace.isReady();
      const blocked = this.busy() || this.committed() || !!this.review();
      if (ready && !blocked) untracked(() => {
        if (previous && previous !== key) { this.clear(); this.error.set(''); }
        previous = key;
      });
    });
    effect(() => {
      const ids = new Set(source.groups().filter(group => !group.unavailable).map(group => group.id));
      if (this.workspace.isReady()) untracked(() => this.selected.update(selected => selected.filter(id => ids.has(id))));
    });
    registerDataDraft(signal(false), () => {}, computed(() => this.busy() || this.committed() || !!this.review()));
  }

  toggleSelection(): void {
    if (!this.canToggle()) return;
    if (this.selecting()) this.clear(); else this.selecting.set(true);
  }
  clear(): void {
    if (!this.canAct()) return;
    this.selected.set([]); this.selecting.set(false);
  }
  select(change: { guid: string; selected: boolean }): void {
    if (!this.canAct() || !this.selecting() || !this.selectable()[change.guid]) return;
    this.selected.update(ids => change.selected ? [...new Set([...ids, change.guid])] : ids.filter(id => id !== change.guid));
  }
  selectAll(): void {
    if (this.canAct() && this.selecting()) this.selected.set(this.source.matching().filter(group => !group.unavailable).map(group => group.id));
  }
  requestDelete(id?: string): boolean {
    if (!this.canAct()) return false;
    const ids = new Set(id ? [id] : this.selected());
    const accountGuid = this.workspace.account()?.guid;
    const groups = this.source.groups().filter(group => ids.has(group.id) && !group.unavailable).flatMap(entry => {
      const group = this.workspace.energyUseGroups().find(group => group.guid === entry.guid && group.facilityId === entry.facility.guid && group.accountId === accountGuid);
      return group ? [{ group, items: this.workspace.energyUseEquipment().filter(item => item.energyUseGroupId === group.guid) }] : [];
    });
    if (!accountGuid || !groups.length || groups.length !== ids.size) return false;
    this.error.set('');
    this.review.set(structuredClone({ accountGuid, key: this.source.key(), groups }));
    return true;
  }
  cancel(): void {
    if (!this.busy() && !this.committed()) { this.review.set(undefined); this.error.set(''); }
  }
  async confirm(): Promise<boolean> {
    const review = this.review();
    if (!review || !this.canConfirm()) return false;
    this.busy.set(true); this.error.set('');
    try {
      await this.injector.get(EnergyUseActionsService).deleteGroups(review.accountGuid, review.groups);
      return this.finish(review);
    } catch (error) {
      if (!this.destroy.destroyed && this.review() === review) {
        this.committed.set(error instanceof WorkspaceWriteError && error.persistenceCommitted);
        this.error.set(this.committed() ? 'Groups were deleted, but the workspace could not refresh. Refresh saved changes to continue.'
          : error instanceof Error ? error.message : 'The deletion failed. No groups were deleted.');
      }
      return false;
    } finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  async recover(): Promise<boolean> {
    const review = this.review();
    if (!review || !this.committed() || this.busy()) return false;
    this.busy.set(true); this.error.set('');
    try {
      await this.injector.get(EnergyUseActionsService).recoverPublication(review.accountGuid);
      return this.finish(review);
    } catch (error) {
      if (!this.destroy.destroyed) this.error.set(error instanceof Error ? error.message : 'Refresh failed. The deletion will not be repeated.');
      return false;
    } finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  private finish(review: GroupDeletionReview): boolean {
    if (this.destroy.destroyed || this.review() !== review) return false;
    this.review.set(undefined); this.committed.set(false); this.selected.set([]); this.selecting.set(false);
    return true;
  }
  private ordered(items: readonly import('@data/models/idbModels/facilityEnergyUseEquipment').IdbFacilityEnergyUseEquipment[]) {
    return [...items].sort((a, b) => a.guid.localeCompare(b.guid));
  }
}
