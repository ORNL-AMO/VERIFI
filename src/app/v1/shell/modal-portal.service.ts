import { Injectable, signal } from '@angular/core';
import { Portal } from '@angular/cdk/portal';

interface ModalPortalOptions {
  readonly blockWorkspace?: boolean;
}

/**
 * Allows components inside the isolated workspace stacking context to render
 * modal layers at the shell root level, where they paint above the header and
 * side panels.
 */
@Injectable({ providedIn: 'root' })
export class ModalPortalService {
  readonly activePortal = signal<Portal<unknown> | null>(null);
  private readonly blockingWorkspace = signal(false);
  readonly workspaceBlocked = this.blockingWorkspace.asReadonly();

  show(portal: Portal<unknown>, options: ModalPortalOptions = {}): void {
    this.blockingWorkspace.set(options.blockWorkspace ?? false);
    this.activePortal.set(portal);
  }

  hide(): void {
    this.activePortal.set(null);
    this.blockingWorkspace.set(false);
  }
}
