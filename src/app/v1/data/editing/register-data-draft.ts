import { DestroyRef, Signal, assertInInjectionContext, computed, inject } from '@angular/core';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

/** Data drafts confirm discard; they deliberately do not participate in navigation-time flushing. */
export function registerDataDraft(isDirty: Signal<boolean>, discard: () => void, isBlocked: Signal<boolean>): void {
  assertInInjectionContext(registerDataDraft);
  const destroy = inject(DestroyRef);
  const unsaved = inject(UnsavedChangesService);
  const unregister = unsaved.register(isDirty, discard, isBlocked);
  const unprotect = unsaved.protectBeforeUnload(computed(() => isDirty() || isBlocked()));
  destroy.onDestroy(() => { unregister(); unprotect(); });
}
