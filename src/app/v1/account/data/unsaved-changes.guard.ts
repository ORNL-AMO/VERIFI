import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  isNavigationBlocked?(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component => {
  if (component.isNavigationBlocked?.()) return false;
  return !component.hasUnsavedChanges() || inject(UnsavedChangesService).confirmDiscard(true);
};
