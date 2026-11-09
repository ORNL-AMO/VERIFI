import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { getRandomFlatHexColor } from '@data/models/idbModels/facilityEnergyUseGroups';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { defaultEnergyUseSource, previousEnergyUseYear } from '../models/energy-use-settings.models';
import { ENERGY_USE_CATEGORIES } from '@data/models/energy-use-options';
import type { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { energyUseIcon } from '../models/energy-use-icons';

type CreationStep = 'facility' | 'group' | 'category' | 'new-group' | 'name';

@Component({ selector: 'app-create-energy-use-drawer', templateUrl: './create-energy-use-drawer.component.html',
  styleUrls: ['./create-energy-use-drawer.component.css', '../../../shared/creation-flow/creation-flow.css'], standalone: false })
export class CreateEnergyUseDrawerComponent {
  readonly initialFacilityGuid = input<string>();
  readonly initialGroupGuid = input<string>();
  readonly singleFacility = input(false);
  readonly created = output<IdbFacilityEnergyUseEquipment>();
  readonly closed = output<void>();
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly destroy = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid ?? '';
  private readonly request = { item: getNewIdbEntry(), groupGuid: getNewIdbEntry().guid, color: getRandomFlatHexColor() };
  private initialYear?: number;
  readonly saving = signal(false);
  readonly error = signal('');
  readonly dirty = signal(false);
  readonly discardOpen = signal(false);
  readonly step = signal<CreationStep>('facility');
  readonly form = new FormGroup({
    facilityGuid: new FormControl('', { nonNullable: true }),
    groupKind: new FormControl<'existing' | 'new' | null>(null),
    groupGuid: new FormControl('', { nonNullable: true }),
    groupName: new FormControl('', { nonNullable: true }),
    category: new FormControl<EquipmentType | null>(null),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] })
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly categories = ENERGY_USE_CATEGORIES.map(name => ({ name, icon: energyUseIcon(name) }));
  readonly facilitySearch = new FormControl('', { nonNullable: true });
  readonly groupSearch = new FormControl('', { nonNullable: true });
  private readonly facilityTerm = toSignal(this.facilitySearch.valueChanges, { initialValue: '' });
  private readonly groupTerm = toSignal(this.groupSearch.valueChanges, { initialValue: '' });
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(facility => facility.accountId === this.accountGuid), this.workspace.account()?.portfolioFacilityOrder));
  readonly fixedFacilityGuid = computed(() => this.initialFacilityGuid() || (this.singleFacility() && this.facilities().length === 1 ? this.facilities()[0].guid : undefined));
  readonly facility = computed(() => this.facilities().find(facility => facility.guid === this.values().facilityGuid));
  readonly groups = computed(() => this.workspace.energyUseGroups().filter(group => group.accountId === this.accountGuid && group.facilityId === this.values().facilityGuid));
  readonly matchingFacilities = computed(() => this.facilities().filter(facility => (facility.name || 'Unnamed facility').toLocaleLowerCase().includes(this.facilityTerm().trim().toLocaleLowerCase())));
  readonly matchingGroups = computed(() => this.groups().filter(group => (group.name || 'Unnamed energy-use group').toLocaleLowerCase().includes(this.groupTerm().trim().toLocaleLowerCase())));
  readonly selectedGroup = computed(() => this.groups().find(group => group.guid === this.values().groupGuid));
  readonly canEdit = computed(() => this.workspace.account()?.guid === this.accountGuid && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly availabilityError = computed(() => {
    const values = this.values();
    if (values.facilityGuid && !this.facility()) return 'This facility is no longer available.';
    if (values.groupKind === 'existing' && !this.selectedGroup()) return 'This energy-use group is no longer available. Choose another group.';
    return '';
  });
  readonly canUseNewGroup = computed(() => this.canEdit() && !!this.facility() && !!this.values().groupName?.trim());
  readonly canCreate = computed(() => this.canEdit() && this.step() === 'name' && !!this.facility() && !this.availabilityError()
    && !!this.values().category && !!this.values().name?.trim() && (this.values().groupKind === 'existing' ? !!this.selectedGroup() : this.values().groupKind === 'new' && !!this.values().groupName?.trim()));
  readonly blocked = computed(() => this.saving());
  readonly selections = computed(() => {
    const values = this.values(), step = this.step();
    const selections: { id: 'facility' | 'group' | 'category'; label: string; icon: IconName; editable: boolean; active: boolean }[] = [];
    if (values.facilityGuid) selections.push({ id: 'facility', label: this.facility()?.name || 'Facility unavailable', icon: 'facility', editable: !this.fixedFacilityGuid(), active: step === 'facility' });
    if (values.groupKind) selections.push({ id: 'group', label: values.groupKind === 'new' ? values.groupName?.trim() || 'New energy-use group' : this.selectedGroup()?.name || 'Group unavailable', icon: 'energyUseGroup', editable: true, active: step === 'group' || step === 'new-group' });
    if (values.category) selections.push({ id: 'category', label: values.category, icon: energyUseIcon(values.category), editable: true, active: step === 'category' });
    return selections;
  });
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly itemName = viewChild<ElementRef<HTMLInputElement>>('itemName');
  private readonly groupName = viewChild<ElementRef<HTMLInputElement>>('groupName');
  private focusedStep?: CreationStep;

  constructor() {
    registerDataDraft(this.dirty, () => this.discard(), this.blocked);
    const subscription = this.form.valueChanges.subscribe(() => { this.dirty.set(true); this.error.set(''); });
    this.destroy.onDestroy(() => subscription.unsubscribe());
    let initialized = false;
    effect(() => {
      const initialGroup = this.initialGroupGuid();
      const guid = this.fixedFacilityGuid(), facility = this.facilities().find(facility => facility.guid === guid);
      if (!initialized && facility) {
        initialized = true;
        untracked(() => {
          this.form.controls.facilityGuid.setValue(facility.guid);
          this.initialYear = previousEnergyUseYear(facility);
          const group = this.groups().find(group => group.guid === initialGroup);
          if (group) this.form.patchValue({ groupKind: 'existing', groupGuid: group.guid });
          this.step.set(group ? 'category' : 'group'); this.dirty.set(false);
        });
      }
    });
    effect(() => {
      const enabled = this.canEdit();
      untracked(() => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false }));
    });
    afterRenderEffect(() => {
      const step = this.step();
      const target = step === 'name' ? this.itemName()?.nativeElement : step === 'new-group' ? this.groupName()?.nativeElement : this.stepHeading()?.nativeElement;
      if (target && step !== this.focusedStep) { this.focusedStep = step; target.focus(); }
    });
  }
  selectFacility(guid: string): void {
    if (!this.canEdit() || this.fixedFacilityGuid()) return;
    const facility = this.facilities().find(facility => facility.guid === guid);
    if (!facility) return;
    if (guid !== this.form.controls.facilityGuid.value) {
      this.form.patchValue({ facilityGuid: guid, groupKind: null, groupGuid: '', groupName: '' });
      this.initialYear = previousEnergyUseYear(facility);
    }
    this.groupSearch.setValue(''); this.step.set('group');
  }
  selectGroup(guid: string): void {
    if (!this.canEdit() || !this.facility() || !this.groups().some(group => group.guid === guid)) return;
    this.form.patchValue({ groupKind: 'existing', groupGuid: guid }); this.step.set('category');
  }
  startNewGroup(): void {
    if (!this.canEdit() || !this.facility()) return;
    this.form.patchValue({ groupKind: 'new', groupGuid: '' }); this.step.set('new-group');
  }
  selectCategory(category: EquipmentType): void {
    if (!this.canEdit() || !this.facility() || !this.form.controls.groupKind.value || !ENERGY_USE_CATEGORIES.includes(category)) return;
    this.form.controls.category.setValue(category);
    this.step.set('name');
  }
  useNewGroup(): void {
    this.form.controls.groupName.markAsTouched();
    if (this.canUseNewGroup()) this.step.set('category');
  }
  editSelection(selection: 'facility' | 'group' | 'category'): void {
    if (!this.canEdit() || (selection === 'facility' && this.fixedFacilityGuid())) return;
    this.step.set(selection);
  }
  requestClose(): void {
    if (this.saving()) return;
    // The parent shell portal stays mounted while the nested confirmation reviews this draft.
    if (this.dirty()) this.discardOpen.set(true); else this.closed.emit();
  }
  discard(): void { if (!this.saving()) { this.discardOpen.set(false); this.dirty.set(false); this.closed.emit(); } }
  async submit(): Promise<void> {
    if (this.step() === 'new-group') { this.useNewGroup(); return; }
    if (this.step() !== 'name') return;
    this.form.controls.name.markAsTouched();
    if (!this.canCreate()) return;
    const value = this.form.getRawValue(), facility = this.facility()!;
    this.saving.set(true); this.error.set('');
    try {
      const saved = await this.actions.create({
        settings: { name: value.name, notes: '', equipmentType: value.category!, sources: [defaultEnergyUseSource()], utilityMeterGroupIds: [] },
        initialYear: this.initialYear ?? previousEnergyUseYear(facility),
        group: value.groupKind === 'new' ? { kind: 'new', name: value.groupName.trim() } : { kind: 'existing', guid: value.groupGuid }
      }, this.accountGuid, facility.guid, this.request);
      if (!this.destroy.destroyed && this.workspace.account()?.guid === this.accountGuid && this.facility()?.guid === facility.guid) {
        this.dirty.set(false); this.created.emit(saved);
      }
    } catch (error) {
      if (!this.destroy.destroyed) this.error.set(error instanceof WorkspaceWriteError && error.persistenceCommitted
        ? 'The energy use was saved, but the workspace could not be refreshed. Retry to reload it.'
        : error instanceof Error ? error.message : 'The energy use could not be added.');
    } finally { if (!this.destroy.destroyed) this.saving.set(false); }
  }
}
