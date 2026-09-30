import { inject } from '@angular/core';
import { CanDeactivateFn, RouterStateSnapshot } from '@angular/router';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  isNavigationBlocked?(): boolean;
  canNavigateWithoutDiscard?(nextState: RouterStateSnapshot): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges | null> = (component, _currentRoute, _currentState, nextState) => {
  if (!component) return true;
  if (component.isNavigationBlocked?.()) return false;
  if (component.canNavigateWithoutDiscard?.(nextState)) return true;
  return !component.hasUnsavedChanges() || inject(UnsavedChangesService).confirmDiscard(true);
};
