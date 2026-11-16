import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';

export interface FacilityChoice { readonly guid: string; readonly name?: string; }

/** Produces selection proposals; the parent applies confirmed edits to the authoritative input. */
@Component({ selector: 'app-visualization-facility-picker', standalone: false,
  templateUrl: './facility-picker.component.html', styleUrls: ['./facility-picker.component.css'] })
export class FacilityPickerComponent {
  readonly selection = input.required<VisualizationFacilitySelection>();
  readonly facilities = input<readonly FacilityChoice[]>([]);
  readonly disabled = input(false);
  readonly busy = input(false);
  readonly contextKey = input<unknown>();
  readonly selectionRequested = output<VisualizationFacilitySelection>();
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = signal('');
  private readonly destroy = inject(DestroyRef);
  readonly all = computed(() => this.selection().kind === 'all');
  readonly selectedIds = computed(() => { const value = this.selection(); return value.kind === 'all' ? this.facilities().map(item => item.guid) : value.facilityGuids; });
  readonly rows = computed(() => {
    const selected = this.selectedIds(), facilities = this.facilities(), query = this.query().trim().toLocaleLowerCase();
    return [...facilities.map(facility => ({ guid: facility.guid, name: facility.name || 'Unnamed facility', missing: false })),
      ...selected.filter(guid => !facilities.some(item => item.guid === guid)).map(guid => ({ guid, name: `Unavailable facility: ${guid}`, missing: true }))]
      .filter(item => !query || item.name.toLocaleLowerCase().includes(query))
      .map(item => ({ ...item, selected: selected.includes(item.guid), final: selected.length === 1 && selected.includes(item.guid) }));
  });
  readonly selectedCount = computed(() => this.selectedIds().length);
  private readonly facilityMembershipKey = computed(() => JSON.stringify(this.facilities().map(item => item.guid).sort()));
  readonly interactionKey = computed(() => ({ context: this.contextKey(), facilities: this.facilityMembershipKey(), disabled: this.disabled() }));

  constructor() { this.search.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(value => this.query.set(value)); }

  selectAll(): void {
    if (!this.disabled() && !this.busy() && !this.all() && this.facilities().length) this.selectionRequested.emit({ kind: 'all' });
  }
  selectOnly(guid: string): void {
    if (this.disabled() || this.busy() || !this.facilities().some(item => item.guid === guid)) return;
    const selection = this.selection();
    if (selection.kind === 'fixed' && selection.facilityGuids.length === 1 && selection.facilityGuids[0] === guid) return;
    this.selectionRequested.emit({ kind: 'fixed', facilityGuids: [guid] });
  }
  toggle(guid: string): void {
    if (this.disabled() || this.busy()) return;
    const selected = this.selectedIds(), owned = this.facilities();
    if (selected.includes(guid) && selected.length === 1 || !selected.includes(guid) && !owned.some(item => item.guid === guid)) return;
    const adding = !selected.includes(guid);
    const next = adding ? [...selected, guid] : selected.filter(item => item !== guid);
    this.selectionRequested.emit(adding && next.length === owned.length && owned.every(item => next.includes(item.guid))
      ? { kind: 'all' } : { kind: 'fixed', facilityGuids: next });
  }
}
