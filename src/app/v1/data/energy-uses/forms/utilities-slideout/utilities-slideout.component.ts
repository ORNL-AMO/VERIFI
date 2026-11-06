import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { MeterSource } from '@data/models/constantsAndTypes';
import { ENERGY_USE_SOURCES } from '@data/models/energy-use-options';
import { EnergyUseSourceValues, EnergyUseUtilitySelection } from '../../models/energy-use-settings.models';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';

@Component({ selector: 'app-energy-use-utilities-slideout', templateUrl: './utilities-slideout.component.html',
  styleUrls: ['./utilities-slideout.component.css'], standalone: false })
export class UtilitiesSlideoutComponent {
  readonly sources = input<readonly EnergyUseSourceValues[]>([]);
  readonly canEdit = input(true);
  readonly hasLinkedGroups = input(false);
  readonly confirmed = output<EnergyUseUtilitySelection>();
  readonly closed = output<void>();
  readonly form = new FormRecord<FormControl<boolean>>({});
  private readonly baseline = signal<readonly EnergyUseSourceValues[] | undefined>(undefined);
  readonly selected = signal<readonly MeterSource[]>([]);
  readonly utilities = computed(() => [...new Set([...ENERGY_USE_SOURCES, ...(this.baseline() ?? this.sources()).map(source => source.energySource)])]);
  readonly choices = computed(() => this.utilities().map(source => ({ source, icon: meterSourceIcon(source) })));
  readonly stale = computed(() => this.baseline() !== undefined && !draftEqual(this.sources(), this.baseline()));
  readonly canConfirm = computed(() => {
    const baseline = this.baseline();
    if (!baseline || !this.canEdit() || this.stale() || new Set(baseline.map(source => source.energySource)).size !== baseline.length) return false;
    return this.selected().length <= 2 || this.selected().every(source => baseline.some(row => row.energySource === source));
  });

  constructor() {
    const subscription = this.form.valueChanges.subscribe(() => {
      this.selected.set(this.utilities().filter(source => this.form.controls[source]?.value));
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    let initialized = false;
    effect(() => {
      const sources = this.sources(), canEdit = this.canEdit();
      if (!initialized) {
        initialized = true;
        this.baseline.set(structuredClone(sources));
        this.selected.set(sources.map(source => source.energySource));
        for (const source of this.utilities()) {
          this.form.addControl(source, new FormControl(sources.some(row => row.energySource === source), { nonNullable: true }), { emitEvent: false });
        }
      }
      const selected = new Set(this.selected());
      const baseline = this.baseline()!;
      const ambiguous = new Set(baseline.map(source => source.energySource)).size !== baseline.length;
      const retainsOnlySaved = this.selected().every(source => baseline.some(row => row.energySource === source));
      for (const source of this.utilities()) {
        const control = this.form.controls[source];
        const restoresSaved = retainsOnlySaved && baseline.some(row => row.energySource === source);
        if (!canEdit || ambiguous || this.stale() || (!selected.has(source) && selected.size >= 2 && !restoresSaved)) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      }
    });
  }
  confirm(): void {
    if (this.canConfirm()) this.confirmed.emit({ baseline: structuredClone(this.baseline()!), selected: [...this.selected()] });
  }
}
