import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { energyUseLinkedSources, energyUseMeterLinksError } from '@data/account-workspace/handlers/energy-use-command.models';
import { ENERGY_USE_SOURCES } from '@data/models/energy-use-options';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { EnergyUseMeterGroupSelection, EnergyUseSourceValues, defaultEnergyUseSource } from '../../models/energy-use-settings.models';

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
  readonly stale = computed(() => this.baseline() !== undefined && (!draftEqual(this.linkedIds(), this.baseline()) || !draftEqual(this.sources(), this.baselineSources())));
  readonly error = computed(() => this.validate(this.selected()));
  readonly canConfirm = computed(() => {
    const baseline = this.baseline();
    if (!baseline || !this.canEdit() || this.stale()) return false;
    const unchangedLinks = draftEqual([...this.selected()].sort(), [...baseline].sort());
    const unchangedUtilities = draftEqual((this.baselineSources() ?? []).map(source => source.energySource).sort(), [...this.linkedSources(this.selected())].sort());
    return (unchangedLinks && (!this.selected().length || unchangedUtilities)) || !this.error();
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
    const sources = this.linkedSources(ids);
    const additions = sources.filter(source => !this.sources().some(row => row.energySource === source));
    if (additions.some(source => !ENERGY_USE_SOURCES.includes(source))) return 'This meter group contains an unsupported energy-use utility.';
    if (additions.length && sources.length > 2) return 'Select meter groups supplying no more than two utilities.';
    return energyUseMeterLinksError({ accountId: this.accountGuid(), facilityId: this.facilityGuid(), utilityMeterGroupIds: [...ids],
      utilityData: sources.map(source => ({ ...(this.sources().find(row => row.energySource === source) ?? defaultEnergyUseSource(source)), energyUse: [] })) }, this.groups(), this.meters());
  }
  private linkedSources(ids: readonly string[]) {
    return energyUseLinkedSources({ accountGuid: this.accountGuid(), facilityGuid: this.facilityGuid() }, ids, this.meters());
  }
}
