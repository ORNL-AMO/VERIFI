import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-equipment-utility-data-form',
  standalone: false,
  templateUrl: './equipment-utility-data-form.component.html',
  styleUrl: './equipment-utility-data-form.component.css',
})
export class EquipmentUtilityDataFormComponent {
  energySource = input.required<MeterSource>();
  utilityDataForm = input.required<FormGroup>();
  equipmentDetailsForm = input.required<FormGroup>();
  @Output('emitRemoveUtilityType')
  emitRemoveUtilityType: EventEmitter<void> = new EventEmitter<void>();
  inSetup = input(false);


  removeUtilityType() {
    this.emitRemoveUtilityType.emit();
  }
}
