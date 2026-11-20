import { Signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/** Stage changes retain the workbench, so its outer leave guard cannot protect a deletion hold. */
export const analysisSetupDeletionGuard: CanDeactivateFn<{ readonly autosave: { readonly deletionHeld: Signal<boolean> } }> =
  component => !component.autosave.deletionHeld();
