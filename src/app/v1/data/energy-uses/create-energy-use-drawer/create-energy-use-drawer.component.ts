import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { MeterSource } from '@data/models/constantsAndTypes';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { getRandomFlatHexColor } from '@data/models/idbModels/facilityEnergyUseGroups';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { EnergyUseSettingsFormService } from '../forms/energy-use-settings-form.service';
import { EnergyUseUtilitySelection, EnergyUseMeterGroupSelection, defaultEnergyUseSource, energyUseSettingsError, previousEnergyUseYear } from '../models/energy-use-settings.models';

@Component({ selector: 'app-create-energy-use-drawer', templateUrl: './create-energy-use-drawer.component.html',
  styleUrls: ['./create-energy-use-drawer.component.css'], standalone: false })
export class CreateEnergyUseDrawerComponent {
  readonly initialFacilityGuid = input<string>();
  readonly singleFacility = input(false);
  readonly created = output<IdbFacilityEnergyUseEquipment>();
  readonly closed = output<void>();
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly forms = inject(EnergyUseSettingsFormService);
  private readonly destroy = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid ?? '';
  private readonly request = { item: getNewIdbEntry(), groupGuid: getNewIdbEntry().guid, color: getRandomFlatHexColor() };
  readonly saving = signal(false);
  readonly error = signal('');
  readonly dirty = signal(false);
  readonly discardOpen = signal(false);
  readonly form = this.forms.build({ name: '', notes: '', equipmentType: 'Other', sources: [defaultEnergyUseSource()], utilityMeterGroupIds: [] });
  readonly contextForm = new FormGroup({ facilityGuid: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    initialYear: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(9999)]),
    groupKind: new FormControl<'existing' | 'new'>('new', { nonNullable: true }), groupGuid: new FormControl('', { nonNullable: true }),
    groupName: new FormControl('', { nonNullable: true }) });
  readonly context = toSignal(this.contextForm.valueChanges, { initialValue: this.contextForm.getRawValue() });
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(facility => facility.accountId === this.accountGuid), this.workspace.account()?.portfolioFacilityOrder));
  readonly facility = computed(() => this.facilities().find(facility => facility.guid === this.context().facilityGuid));
  readonly groups = computed(() => this.workspace.energyUseGroups().filter(group => group.accountId === this.accountGuid && group.facilityId === this.facility()?.guid));
  readonly canCreate = computed(() => !!this.facility() && this.workspace.account()?.guid === this.accountGuid && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly blocked = computed(() => this.saving());
  readonly refreshKey = signal(0);
  constructor() {
    this.forms.validate(this.form);
    registerDataDraft(this.dirty, () => this.discard(), this.blocked);
    const markDirty = () => { this.dirty.set(true); this.error.set(''); };
    const subscriptions = [this.form.valueChanges.subscribe(markDirty), this.contextForm.valueChanges.subscribe(markDirty)];
    this.destroy.onDestroy(() => subscriptions.forEach(subscription => subscription.unsubscribe()));
    let initialized = false;
    effect(() => {
      const guid = this.initialFacilityGuid(), facilities = this.facilities();
      if (!initialized && guid && facilities.some(facility => facility.guid === guid)) {
        initialized = true;
        untracked(() => { this.contextForm.controls.facilityGuid.setValue(guid); this.dirty.set(false); });
      }
    });
    let previousFacility: string | undefined;
    effect(() => {
      const facility = this.facility();
      if (!facility || previousFacility === facility.guid) return;
      const initial = previousFacility === undefined;
      previousFacility = facility.guid;
      untracked(() => {
        this.contextForm.patchValue({ initialYear: previousEnergyUseYear(facility), groupGuid: '', groupKind: 'new' });
        this.form.controls.utilityMeterGroupIds.setValue([]);
        if (initial) this.dirty.set(false);
      });
    });
    effect(() => {
      const enabled = !this.saving() && this.workspace.canWrite() && !this.workspace.hasPending();
      untracked(() => {
        for (const form of [this.form, this.contextForm]) enabled ? form.enable({ emitEvent: false }) : form.disable({ emitEvent: false });
      });
    });
  }
  addSource(source: MeterSource): void {
    if (!this.canCreate() || this.form.controls.sources.length >= 2 || this.form.controls.sources.getRawValue().some(row => row.energySource === source)) return;
    this.form.controls.sources.push(this.forms.source(defaultEnergyUseSource(source)));
  }
  removeSource(source: { energySource: MeterSource }): void {
    if (!this.canCreate()) return;
    const index = this.form.controls.sources.controls.findIndex(row => row.controls.energySource.value === source.energySource);
    if (index >= 0) this.form.controls.sources.removeAt(index);
  }
  confirmUtilities(selection: EnergyUseUtilitySelection): void {
    if (this.canCreate() && !this.form.controls.utilityMeterGroupIds.value.length) this.forms.applyUtilities(this.form, selection);
  }
  confirmMeterGroups(selection: EnergyUseMeterGroupSelection): void {
    if (this.canCreate()) this.forms.applyMeterGroups(this.form, selection);
  }
  requestClose(): void {
    if (this.saving()) return;
    if (this.dirty()) this.discardOpen.set(true); else this.closed.emit();
  }
  discard(): void { if (!this.saving()) { this.dirty.set(false); this.closed.emit(); } }
  async submit(): Promise<void> {
    this.form.markAllAsTouched(); this.contextForm.markAllAsTouched();
    if (!this.canCreate()) return;
    const value = this.contextForm.getRawValue(), settings = this.form.getRawValue();
    const error = energyUseSettingsError(settings);
    if (error || !Number.isInteger(value.initialYear) || value.initialYear! < 1 || value.initialYear! > 9999
      || (value.groupKind === 'new' ? !value.groupName.trim() : !this.groups().some(group => group.guid === value.groupGuid))) {
      this.error.set(error || 'Enter an initial year and choose an energy-use group or enter a new group name.'); return;
    }
    const guid = this.facility()!.guid;
    this.saving.set(true); this.error.set('');
    try {
      const saved = await this.actions.create({ settings, initialYear: value.initialYear!,
        group: value.groupKind === 'new' ? { kind: 'new', name: value.groupName } : { kind: 'existing', guid: value.groupGuid } }, this.accountGuid, guid, this.request);
      if (!this.destroy.destroyed && this.workspace.account()?.guid === this.accountGuid && this.facility()?.guid === guid) {
        this.dirty.set(false); this.created.emit(saved);
      }
    } catch (error) {
      if (!this.destroy.destroyed) this.error.set(error instanceof WorkspaceWriteError && error.persistenceCommitted
        ? 'The energy use was saved, but the workspace could not be refreshed. Retry to reload it.'
        : error instanceof Error ? error.message : 'The energy use could not be added.');
    } finally { if (!this.destroy.destroyed) this.saving.set(false); }
  }
}
