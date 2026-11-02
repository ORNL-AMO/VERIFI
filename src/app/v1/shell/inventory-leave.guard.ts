import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

/** Inventory registrations also cover parent drawers and child selection tools. */
export const inventoryLeaveGuard: CanDeactivateFn<unknown> = async (_component, _route, current, next) => {
  // Reused inventory routes rerun deactivation on query changes. The scope guard
  // owns those transitions, including removing an already-unavailable facility.
  if (current.url.split(/[?#]/, 1)[0] === next.url.split(/[?#]/, 1)[0]) return true;
  const workspace = inject(AccountWorkspaceStore);
  const changes = inject(UnsavedChangesService);
  if (workspace.hasPending() || !await changes.flushPendingChanges()) return false;
  return !workspace.hasPending() && changes.confirmDiscard();
};
