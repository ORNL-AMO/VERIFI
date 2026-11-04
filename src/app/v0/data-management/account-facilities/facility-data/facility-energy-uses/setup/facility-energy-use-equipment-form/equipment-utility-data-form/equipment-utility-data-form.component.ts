import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, EventEmitter, inject, input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MeterSource } from '@data/models/constantsAndTypes';
import { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

@Component({
  selector: 'app-equipment-utility-data-form',
  standalone: false,
  templateUrl: './equipment-utility-data-form.component.html',
  styleUrl: './equipment-utility-data-form.component.css',
})
export class EquipmentUtilityDataFormComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  energySource = input.required<MeterSource>();
  utilityDataForm = input.required<FormGroup>();
  equipmentDetailsForm = input.required<FormGroup>();
  @Output('emitRemoveUtilityType')
  emitRemoveUtilityType: EventEmitter<void> = new EventEmitter<void>();
  inSetup = input(false);

  showRatedPowerModal = false;

  removeUtilityType() {
    this.emitRemoveUtilityType.emit();
  }

  openCalculateRatedPowerModal() {
    if (this.showRatedCapacityCalculator) {
      this.showRatedPowerModal = true;
    }
  }

  closeCalculateRatedPowerModal() {
    this.showRatedPowerModal = false;
  }

  get linkedFuelMeters(): Array<IdbUtilityMeter> {
    const linkedGroupIds: Array<string> = this.equipmentDetailsForm().controls.utilityMeterGroupIds.value ?? [];
    return this.accountWorkspaceStore.facilityMeters().filter(meter =>
      linkedGroupIds.includes(meter.groupId) && meter.source === this.energySource()
    );
  }

  get showRatedCapacityCalculator(): boolean {
    const equipmentType: EquipmentType = this.equipmentDetailsForm().controls.equipmentType.value;
    return this.shouldShowRatedCapacityCalculator(
      equipmentType,
      this.energySource(),
      this.linkedFuelMeters.length
    );
  }

  get showMissingUtilityMeterWarning(): boolean {
    return this.shouldShowMissingUtilityMeterWarning(
      this.energySource(),
      this.linkedFuelMeters.length
    );
  }

  applyRatedPower(result: { ratedPower: number, unit: string }) {
    const utilityDataForm = this.utilityDataForm();
    utilityDataForm.controls.size.setValue(result.ratedPower);
    utilityDataForm.controls.units.setValue(result.unit);
    this.closeCalculateRatedPowerModal();
  }

  isRatedCapacityCalculatorSource(source: MeterSource): boolean {
    return source === 'Natural Gas' || source === 'Other Fuels' || source === 'Other Energy';
  }

  isRatedCapacityEquipmentType(equipmentType: EquipmentType): boolean {
    return equipmentType === 'Process Heating'
      || equipmentType === 'Process Cooling'
      || equipmentType === 'HVAC'
      || equipmentType === 'Steam';
  }

  shouldShowRatedCapacityCalculator(equipmentType: EquipmentType, source: MeterSource, linkedMeterCount: number): boolean {
    return this.isRatedCapacityEquipmentType(equipmentType)
      && this.isRatedCapacityCalculatorSource(source)
      && linkedMeterCount > 0;
  }

  shouldShowMissingUtilityMeterWarning(source: MeterSource, linkedMeterCount: number): boolean {
    return this.isRatedCapacityCalculatorSource(source) && linkedMeterCount === 0;
  }
}
