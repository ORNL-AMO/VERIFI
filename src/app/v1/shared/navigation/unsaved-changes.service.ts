import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';

interface UnsavedChangesRegistration {
  readonly isDirty: () => boolean;
  readonly discard: () => void;
  readonly isBlocked: () => boolean;
  readonly flush?: () => Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  private readonly registrations = new Set<UnsavedChangesRegistration>();
  private readonly navigationPreflights = new Set<() => Promise<boolean>>();
  private navigationPreflight?: Promise<boolean>;
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly unloadSources = signal<readonly { readonly when: Signal<boolean> }[]>([]);
  private readonly unloadProtected = computed(() => this.unloadSources().some(source => source.when()));

  constructor() {
    effect(onCleanup => {
      const window = this.window;
      if (!window || !this.unloadProtected()) return;
      const beforeUnload = (event: BeforeUnloadEvent) => {
        if (!this.unloadProtected()) return;
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', beforeUnload);
      onCleanup(() => window.removeEventListener('beforeunload', beforeUnload));
    });
  }

  /** Opt-in browser protection; all active Data drafts share one conditional listener. */
  protectBeforeUnload(when: Signal<boolean>): () => void {
    const registration = { when };
    this.unloadSources.update(sources => [...sources, registration]);
    return () => this.unloadSources.update(sources => sources.filter(source => source !== registration));
  }

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

  /** Feature-owned async review before routing or publishing a different account. */
  registerNavigationPreflight(resolve: () => Promise<boolean>): () => void {
    this.navigationPreflights.add(resolve);
    return () => this.navigationPreflights.delete(resolve);
  }

  resolveNavigationPreflight(): Promise<boolean> {
    if (this.navigationPreflight) return this.navigationPreflight;
    this.navigationPreflight = (async () => {
      for (const resolve of [...this.navigationPreflights]) {
        if (!await resolve()) return false;
      }
      return true;
    })().finally(() => this.navigationPreflight = undefined);
    return this.navigationPreflight;
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
