import { FocusTrap } from '@angular/cdk/a11y';
import { Injectable } from '@angular/core';

/** Only the top modal owns keyboard containment and focus restoration. */
@Injectable({ providedIn: 'root' })
export class ModalFocusStackService {
  private traps: FocusTrap[] = [];

  activate(trap: FocusTrap): void {
    const previous = this.traps.at(-1);
    if (previous) previous.enabled = false;
    this.traps.push(trap);
  }

  isActive(trap: FocusTrap): boolean { return this.traps.at(-1) === trap; }

  remove(trap: FocusTrap): boolean {
    const active = this.isActive(trap);
    this.traps = this.traps.filter(current => current !== trap);
    const previous = this.traps.at(-1);
    if (active && previous) previous.enabled = true;
    return active;
  }
}
