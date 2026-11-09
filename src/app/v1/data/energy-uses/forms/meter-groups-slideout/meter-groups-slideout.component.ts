import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { EnergyUseMeterGroupSelection, EnergyUseSourceValues } from '../../models/energy-use-settings.models';
import { meterGroupSelectionError, meterGroupSelectionUnchanged, meterGroupUtilities } from '../../models/energy-use-utility-selection.models';

@Component({ selector: 'app-energy-use-meter-groups-slideout', templateUrl: './meter-groups-slideout.component.html',
  styleUrls: ['./meter-groups-slideout.component.css'], standalone: false })
export class MeterGroupsSlideoutComponent {
  readonly accountGuid = input.required<string>();
  readonly facilityGuid = input.required<string>();
  readonly groups = input<readonly IdbUtilityMeterGroup[]>([]);
  readonly meters = input<readonly IdbUtilityMeter[]>([]);
  readonly sources = input<readonly EnergyUseSourceValues[]>([]);
  readonly linkedIds = input<readonly string[]>([]);
  readonly canEdit = input(true);
  readonly confirmed = output<EnergyUseMeterGroupSelection>();
  readonly closed = output<void>();
  readonly form = new FormRecord<FormControl<boolean>>({});
  private readonly baseline = signal<readonly string[] | undefined>(undefined);
  private readonly baselineSources = signal<readonly EnergyUseSourceValues[] | undefined>(undefined);
  readonly selected = signal<readonly string[]>([]);
  private readonly policy = computed(() => ({ owner: { accountGuid: this.accountGuid(), facilityGuid: this.facilityGuid() },
    sources: this.baselineSources() ?? this.sources(), linkedIds: this.baseline() ?? this.linkedIds(), groups: this.groups(), meters: this.meters() }));
  readonly stale = computed(() => this.baseline() !== undefined && (!draftEqual(this.linkedIds(), this.baseline()) || !draftEqual(this.sources(), this.baselineSources())));
  readonly error = computed(() => this.validate(this.selected()));
  readonly canConfirm = computed(() => {
    const baseline = this.baseline();
    if (!baseline || !this.canEdit() || this.stale()) return false;
    return meterGroupSelectionUnchanged(this.policy(), this.selected()) || !this.error();
  });
  readonly rows = computed(() => {
    const owned = this.groups().filter(group => group.accountId === this.accountGuid() && group.facilityId === this.facilityGuid() && group.groupType === 'Energy')
      .slice().sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
    return [...owned.map(group => {
      const selected = this.selected().includes(group.guid);
      const sources = [...new Set(this.meters().filter(meter => meter.groupId === group.guid
        && meter.accountId === this.accountGuid() && meter.facilityId === this.facilityGuid()).map(meter => meter.source))];
      return { guid: group.guid, name: group.name, selected, available: true,
        sources: sources.map(source => ({ label: source, icon: meterSourceIcon(source) })),
        reason: selected ? undefined : this.validate([...this.selected(), group.guid]) };
    }), ...[...new Set(this.baseline() ?? this.linkedIds())].filter(guid => !owned.some(group => group.guid === guid)).map(guid => ({
      guid, name: 'Unavailable meter group', selected: this.selected().includes(guid), available: false, sources: [],
      reason: 'This saved link is no longer available in this facility. Uncheck it to unlink it.'
    }))];
  });

  constructor() {
    const subscription = this.form.valueChanges.subscribe(() => this.selected.set(this.rows().filter(row => this.form.controls[row.guid]?.value).map(row => row.guid)));
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    let initialized = false;
    effect(() => {
      const links = this.linkedIds(), canEdit = this.canEdit();
      if (!initialized) {
        initialized = true; this.baseline.set([...links]); this.selected.set([...links]); this.baselineSources.set(structuredClone(this.sources()));
      }
      for (const row of this.rows()) {
        if (!this.form.controls[row.guid]) this.form.addControl(row.guid, new FormControl(row.selected, { nonNullable: true }), { emitEvent: false });
        const control = this.form.controls[row.guid];
        if (!canEdit || this.stale() || (!row.selected && (!row.available || !!row.reason))) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      }
    });
  }
  confirm(): void {
    if (this.canConfirm()) this.confirmed.emit({ baseline: [...this.baseline()!], selected: [...this.selected()],
      utilities: { baseline: structuredClone(this.baselineSources()!), selected: [...this.linkedSources(this.selected())] } });
  }
  private validate(ids: readonly string[]): string | undefined {
    return meterGroupSelectionError(this.policy(), ids);
  }
  private linkedSources(ids: readonly string[]) {
    return meterGroupUtilities(this.policy(), ids);
  }
}
