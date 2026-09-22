import { Injectable } from '@angular/core';

interface UnsavedChangesRegistration {
  readonly isDirty: () => boolean;
  readonly discard: () => void;
  readonly isBlocked: () => boolean;
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  private readonly registrations = new Set<UnsavedChangesRegistration>();

  register(isDirty: () => boolean, discard: () => void, isBlocked: () => boolean = () => false): () => void {
    const registration = { isDirty, discard, isBlocked };
    this.registrations.add(registration);
    return () => this.registrations.delete(registration);
  }

  hasUnsavedChanges(): boolean {
    return [...this.registrations].some(registration => registration.isDirty());
  }

  confirmDiscard(forcePrompt = false): boolean {
    if ([...this.registrations].some(registration => registration.isBlocked())) {
      return false;
    }
    if (!forcePrompt && !this.hasUnsavedChanges()) {
      return true;
    }
    if (!window.confirm('Discard unsaved changes?')) {
      return false;
    }
    for (const registration of this.registrations) {
      if (registration.isDirty()) {
        registration.discard();
      }
    }
    return true;
  }
}
