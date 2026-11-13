import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ENERGY_USE_CATEGORIES } from '@data/models/energy-use-options';
import type { EquipmentType, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { energyUseIcon } from '@app/v1/data/energy-uses/models/energy-use-icons';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import { footprintMeterGroupOptions, footprintMeterGroupError } from '../../footprint-equipment-mapping';

interface MappingPanel {
  readonly kind: 'meters' | 'category';
  readonly key: string;
  readonly name: string;
  readonly items: readonly IdbFacilityEnergyUseEquipment[];
}

@Component({
  selector: 'app-import-equipment-step', standalone: true,
  imports: [ReactiveFormsModule, IconComponent, WorkspaceSlideoutComponent],
  templateUrl: './import-equipment-step.component.html',
  styleUrls: ['./import-equipment-step.component.css']
})
export class ImportEquipmentStepComponent {
  readonly state = inject(ImportWizardStateService);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  @ViewChild('mappingPanel') private readonly mappingPanel?: TemplateRef<unknown>;
  readonly panel = signal<MappingPanel | undefined>(undefined);
  readonly meterForm = new FormRecord<FormControl<boolean>>({});
  readonly category = new FormControl<EquipmentType | null>(null);
  readonly selectedIds = signal<readonly string[]>([]);
  readonly error = signal('');
  readonly categories = ENERGY_USE_CATEGORIES.map(name => ({ name, icon: energyUseIcon(name) }));
  readonly key = computed(() => JSON.stringify([this.state.draft().id, this.state.draft().selectedFacilityId]));
  readonly sections = computed(() => {
    const draft = this.state.draft();
    const rows = draft.facilityEnergyUseEquipment.map(item => ({ item, icon: energyUseIcon(item.equipmentType),
      category: item.equipmentType || 'Choose category',
      sources: [...new Set(item.utilityData.map(row => row.energySource))].map(source => ({ name: source, icon: meterSourceIcon(source) })),
      links: item.utilityMeterGroupIds.map(guid => ({ guid, name: this.state.workspace.meterGroups().find(group => group.guid === guid && group.facilityId === draft.selectedFacilityId)?.name || 'Unavailable meter group' })) }));
    const ids = [...new Set([...draft.facilityEnergyUseGroups.map(group => group.guid), ...rows.map(row => row.item.energyUseGroupId)])];
    return ids.map(guid => ({ guid, name: draft.facilityEnergyUseGroups.find(group => group.guid === guid)?.name || 'Group unavailable',
      rows: rows.filter(row => row.item.energyUseGroupId === guid) })).filter(group => group.rows.length);
  });
  readonly options = computed(() => footprintMeterGroupOptions(this.state.workspace.account()?.guid ?? '', this.state.draft().selectedFacilityId,
    this.panel()?.items ?? [], this.state.workspace.meterGroups(), this.state.workspace.meters()));
  readonly meterError = computed(() => footprintMeterGroupError(this.selectedIds(), this.options()));
  readonly stale = computed(() => {
    const panel = this.panel(), draft = this.state.draft();
    return !!panel && (panel.key !== this.key() || panel.items.some(before => JSON.stringify(before) !== JSON.stringify(draft.facilityEnergyUseEquipment.find(item => item.guid === before.guid))));
  });
  readonly choices = computed(() => {
    const selected = this.selectedIds();
    return [...this.options().map(group => ({ ...group, selected: selected.includes(group.guid),
      sources: group.sources.map(source => ({ name: source, icon: meterSourceIcon(source) })),
      reason: selected.includes(group.guid) ? undefined : footprintMeterGroupError([...selected, group.guid], this.options()) })),
      ...selected.filter(guid => !this.options().some(group => group.guid === guid)).map(guid => ({ guid, name: 'Unavailable meter group', selected: true, sources: [], reason: 'Uncheck to remove this unavailable link.' }))];
  });

  constructor() {
    this.meterForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(values => this.selectedIds.set(Object.keys(values).filter(id => values[id])));
    effect(() => {
      for (const choice of this.choices()) {
        if (!this.meterForm.controls[choice.guid]) this.meterForm.addControl(choice.guid, new FormControl(choice.selected, { nonNullable: true }), { emitEvent: false });
        const control = this.meterForm.controls[choice.guid];
        if (this.state.session.pending() || this.stale() || (!choice.selected && !!choice.reason)) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      }
    });
    effect(() => {
      const panel = this.panel();
      if (panel && panel.key !== this.key()) untracked(() => this.close());
    });
    this.destroy.onDestroy(() => this.close());
  }
  openMeters(groupGuid: string, equipmentGuid?: string): void {
    const items = this.state.draft().facilityEnergyUseEquipment.filter(item => item.energyUseGroupId === groupGuid && (!equipmentGuid || item.guid === equipmentGuid));
    if (!items.length) return;
    const name = equipmentGuid ? items[0].name : this.state.draft().facilityEnergyUseGroups.find(group => group.guid === groupGuid)?.name || 'Energy-use group';
    this.open({ kind: 'meters', key: this.key(), name, items: structuredClone(items) });
  }
  openCategory(equipmentGuid: string): void {
    const item = this.state.draft().facilityEnergyUseEquipment.find(item => item.guid === equipmentGuid);
    if (item) this.open({ kind: 'category', key: this.key(), name: item.name, items: [structuredClone(item)] });
  }
  private open(panel: MappingPanel): void {
    if (!this.mappingPanel || this.state.session.pending()) return;
    this.error.set(''); this.panel.set(panel);
    this.category.setValue(ENERGY_USE_CATEGORIES.includes(panel.items[0].equipmentType) ? panel.items[0].equipmentType : null, { emitEvent: false });
    const ids = [...new Set(panel.items.flatMap(item => item.utilityMeterGroupIds))];
    this.selectedIds.set(ids);
    for (const id of Object.keys(this.meterForm.controls)) this.meterForm.removeControl(id, { emitEvent: false });
    for (const choice of this.choices()) this.meterForm.addControl(choice.guid, new FormControl(choice.selected, { nonNullable: true }), { emitEvent: false });
    this.portal = new TemplatePortal(this.mappingPanel, this.view);
    this.modal.show(this.portal, { blockWorkspace: true });
  }
  confirm(): void {
    const panel = this.panel();
    if (!panel || this.stale() || this.state.session.pending()) return;
    if (panel.kind === 'meters' && this.meterError()) return;
    if (panel.kind === 'category' && !this.category.value) return;
    const applied = this.state.setFootprintEquipmentMapping(panel.items, panel.kind === 'meters' ? { meterGroupIds: this.selectedIds() } : { category: this.category.value! });
    if (applied) this.close(); else this.error.set('The equipment or available meter groups changed. Cancel and reopen this panel.');
  }
  close(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.panel.set(undefined);
  }
}
