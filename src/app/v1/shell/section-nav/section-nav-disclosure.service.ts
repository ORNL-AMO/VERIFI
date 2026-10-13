import { Injectable, signal } from '@angular/core';

import type { ResourceNavGroupId } from './models/data-nav.models';
interface Disclosure { readonly facilityGuid?: string; readonly collapsed: boolean; }

/** Navigation-local state survives section view destruction, never workspace persistence. */
@Injectable()
export class SectionNavDisclosureService {
  private readonly slots = signal<Record<ResourceNavGroupId, Disclosure>>({
    meters: { collapsed: false },
    'meter-grouping': { collapsed: false },
    predictors: { collapsed: false }
  });

  isOpen(id: ResourceNavGroupId, facilityGuid: string): boolean {
    const state = this.slots()[id];
    return state.facilityGuid !== facilityGuid || !state.collapsed;
  }

  toggle(id: ResourceNavGroupId, facilityGuid: string): void {
    const collapsed = this.isOpen(id, facilityGuid);
    this.slots.update(slots => ({ ...slots, [id]: { facilityGuid, collapsed } }));
  }
}
