import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Print committed content without mutating or discarding a protected editing session. */
@Injectable({ providedIn: 'root' })
export class HomePrintState {
  readonly active = signal(false);
  constructor() {
    const window = inject(DOCUMENT).defaultView;
    if (!window || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('print');
    const update = () => this.active.set(media.matches);
    update(); media.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => media.removeEventListener('change', update));
  }
}
