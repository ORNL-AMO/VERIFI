import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { ENERGY_USE_CATEGORIES } from '@data/models/energy-use-options';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { EnergyUseMeterGroupSelection, EnergyUseUtilitySelection } from '../../models/energy-use-settings.models';
import { EnergyUseSettingsForm } from '../energy-use-settings-form.service';
import { PowerUnitOptions } from '@shared/unitOptions';

@Component({ selector: 'app-energy-use-settings-fields', templateUrl: './settings-fields.component.html',
  styleUrls: ['./settings-fields.component.css'], standalone: false })
export class SettingsFieldsComponent {
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private portal?: TemplatePortal;
  private drawerKey?: string;
  @ViewChild('utilitiesDrawer') private readonly utilitiesDrawer?: TemplateRef<unknown>;
  @ViewChild('meterGroupsDrawer') private readonly meterGroupsDrawer?: TemplateRef<unknown>;
  readonly drawer = signal<'utilities' | 'meter-groups' | undefined>(undefined);
  readonly form = input.required<EnergyUseSettingsForm>();
  readonly editorKey = input.required<string>();
  readonly accountGuid = input.required<string>();
  readonly facilityGuid = input.required<string>();
  readonly groups = input<readonly IdbUtilityMeterGroup[]>([]);
  readonly meters = input<readonly IdbUtilityMeter[]>([]);
  readonly canEdit = input(true);
  readonly refreshKey = input(0);
  readonly utilitiesConfirmed = output<EnergyUseUtilitySelection>();
  readonly meterGroupsConfirmed = output<EnergyUseMeterGroupSelection>();
  readonly values = signal<ReturnType<EnergyUseSettingsForm['getRawValue']> | undefined>(undefined);
  readonly categories = computed(() => ENERGY_USE_CATEGORIES);
  readonly units = computed(() => PowerUnitOptions.map(unit => ({
    ...unit, shortLabel: /\(([^)]+)\)$/.exec(unit.display)?.[1] ?? unit.value
  })));
  readonly sources = computed(() => this.values()?.sources ?? []);
  readonly duplicateSources = computed(() => new Set(this.sources().map(row => row.energySource)).size !== this.sources().length);
  readonly sourceRows = computed(() => this.sources().map((source, index) => ({ source, index,
    icon: meterSourceIcon(source.energySource),
    control: this.form().controls.sources.at(index),
    knownUnit: this.units().some(unit => unit.value === source.units) })));
  readonly categoryKnown = computed(() => this.categories().includes(this.values()?.equipmentType!));
  readonly linkedIds = computed(() => this.values()?.utilityMeterGroupIds ?? []);
  readonly linkedGroups = computed(() => {
    const owned = this.groups().filter(group => group.accountId === this.accountGuid() && group.facilityId === this.facilityGuid() && group.groupType === 'Energy');
    return this.linkedIds().map(guid => ({ guid, name: owned.find(group => group.guid === guid)?.name ?? 'Unavailable meter group' }));
  });
  constructor() {
    inject(DestroyRef).onDestroy(() => this.closeDrawer());
    effect(() => {
      const key = this.editorKey();
      if (this.drawer() && this.drawerKey !== key) untracked(() => this.closeDrawer());
    });
    effect(onCleanup => {
      this.refreshKey();
      const form = this.form(); this.values.set(form.getRawValue());
      const sub = form.valueChanges.subscribe(() => this.values.set(form.getRawValue()));
      onCleanup(() => sub.unsubscribe());
    });
  }
  openUtilities(): void {
    if (!this.canEdit() || this.duplicateSources() || !this.utilitiesDrawer) return;
    this.openDrawer('utilities', this.utilitiesDrawer);
  }
  openMeterGroups(): void {
    if (!this.canEdit() || this.duplicateSources() || !this.meterGroupsDrawer) return;
    this.openDrawer('meter-groups', this.meterGroupsDrawer);
  }
  private openDrawer(kind: 'utilities' | 'meter-groups', template: TemplateRef<unknown>): void {
    this.drawerKey = this.editorKey();
    this.drawer.set(kind);
    this.portal = new TemplatePortal(template, this.view);
    this.modal.show(this.portal);
  }
  closeDrawer(): void {
    this.drawer.set(undefined);
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
    this.drawerKey = undefined;
  }
  confirmUtilities(selection: EnergyUseUtilitySelection): void {
    if (this.drawer() !== 'utilities' || this.drawerKey !== this.editorKey()) { this.closeDrawer(); return; }
    if (!this.canEdit() || this.duplicateSources()) return;
    this.closeDrawer();
    this.utilitiesConfirmed.emit(selection);
  }
  confirmMeterGroups(selection: EnergyUseMeterGroupSelection): void {
    if (this.drawer() !== 'meter-groups' || this.drawerKey !== this.editorKey()) { this.closeDrawer(); return; }
    if (!this.canEdit()) return;
    this.closeDrawer();
    this.meterGroupsConfirmed.emit(selection);
  }
}
