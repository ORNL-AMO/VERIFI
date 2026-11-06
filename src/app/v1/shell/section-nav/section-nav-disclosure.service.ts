import { Injectable, signal } from '@angular/core';

import type { ResourceNavGroupId } from './models/data-nav.models';
interface Disclosure { readonly facilityGuid?: string; readonly collapsed: boolean; }

/** Navigation-local state survives section view destruction, never workspace persistence. */
@Injectable()
export class SectionNavDisclosureService {
  private readonly nested = signal<Readonly<Record<string, boolean>>>({});
  private activeItem = '';
  isNestedOpen(key: string): boolean { return this.nested()[key] ?? false; }
  toggleNested(key: string): void { this.nested.update(state => ({ ...state, [key]: !this.isNestedOpen(key) })); }
  revealActive(key?: string, itemGuid?: string, facilityGuid?: string): void {
    const identity = key && itemGuid ? JSON.stringify([key, itemGuid]) : '';
    if (identity === this.activeItem) return;
    this.activeItem = identity;
    if (key && itemGuid && facilityGuid) this.slots.update(state => ({ ...state, 'energy-uses': { facilityGuid, collapsed: false } }));
    if (key && itemGuid) this.nested.update(state => ({ ...state, [key]: true }));
  }
  private readonly slots = signal<Record<ResourceNavGroupId, Disclosure>>({
    meters: { collapsed: false },
    'meter-grouping': { collapsed: false },
    predictors: { collapsed: false },
    'energy-uses': { collapsed: false }
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
