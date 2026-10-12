import { Injectable } from '@angular/core';

interface UnsavedChangesRegistration {
  readonly isDirty: () => boolean;
  readonly discard: () => void;
  readonly isBlocked: () => boolean;
  readonly flush?: () => Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  private readonly registrations = new Set<UnsavedChangesRegistration>();

  register(
    isDirty: () => boolean,
    discard: () => void,
    isBlocked: () => boolean = () => false,
    flush?: () => Promise<boolean>
  ): () => void {
    const registration = { isDirty, discard, isBlocked, flush };
    this.registrations.add(registration);
    return () => this.registrations.delete(registration);
  }

  async flushPendingChanges(): Promise<boolean> {
    const pending = [...this.registrations].filter(registration =>
      registration.flush && (registration.isDirty() || registration.isBlocked())
    );
    for (const registration of pending) {
      if (!await registration.flush!()) return false;
    }
    return true;
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
