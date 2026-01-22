import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-equipment-utility-data-form',
  standalone: false,
  templateUrl: './equipment-utility-data-form.component.html',
  styleUrl: './equipment-utility-data-form.component.css',
})
export class EquipmentUtilityDataFormComponent {
  @Input({ required: true })
  energySource: MeterSource;
  @Input({ required: true })
  utilityDataForm: FormGroup;
  @Input({ required: true })
  energyUseForms: Array<FormGroup>;
  @Input({ required: true })
  equipmentDetailsForm: FormGroup;
  @Output('emitRemoveUtilityType')
  emitRemoveUtilityType: EventEmitter<void> = new EventEmitter<void>();
  @Input()
  inSetup: boolean = false;

  removeUtilityType() {
    this.emitRemoveUtilityType.emit();
  }

  toggleOverride(energyUseForm: FormGroup) {
    energyUseForm.patchValue({
      overrideEnergyUse: !energyUseForm.controls.overrideEnergyUse.value
    });
    if (!energyUseForm.controls.overrideEnergyUse.value) {
      //calculate
    }
  }
}
