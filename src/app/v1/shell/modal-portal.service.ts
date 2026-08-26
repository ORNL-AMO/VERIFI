import { Injectable, signal } from '@angular/core';
import { Portal } from '@angular/cdk/portal';

/**
 * Allows components inside the isolated workspace stacking context to render
 * modal layers at the shell root level, where they paint above the header and
 * side panels.
 */
@Injectable({ providedIn: 'root' })
export class ModalPortalService {
  readonly activePortal = signal<Portal<unknown> | null>(null);

  show(portal: Portal<unknown>): void {
    this.activePortal.set(portal);
  }

  hide(): void {
    this.activePortal.set(null);
  }
}
