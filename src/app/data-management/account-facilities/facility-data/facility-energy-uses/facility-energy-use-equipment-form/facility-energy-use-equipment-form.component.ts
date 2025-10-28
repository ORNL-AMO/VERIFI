import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { EquipmentTypes } from './equipmentTypes';

@Component({
  selector: 'app-facility-energy-use-equipment-form',
  standalone: false,
  templateUrl: './facility-energy-use-equipment-form.component.html',
  styleUrl: './facility-energy-use-equipment-form.component.css'
})
export class FacilityEnergyUseEquipmentFormComponent {
  @Input({required: true})
  form: FormGroup;

   equipmentTypes: Array<EquipmentType> = EquipmentTypes;
  
}
