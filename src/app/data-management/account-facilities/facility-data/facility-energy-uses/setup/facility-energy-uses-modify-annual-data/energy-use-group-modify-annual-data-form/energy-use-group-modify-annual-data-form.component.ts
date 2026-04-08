import { Component, Input } from '@angular/core';
import { EnergyEquipmentOperatingConditionsData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from '../../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-energy-use-group-modify-annual-data-form',
  standalone: false,
  templateUrl: './energy-use-group-modify-annual-data-form.component.html',
  styleUrl: './energy-use-group-modify-annual-data-form.component.css',
})
export class EnergyUseGroupModifyAnnualDataFormComponent {
  @Input({ required: true })
  equipment: IdbFacilityEnergyUseEquipment;
  @Input({ required: true })
  year: number;
  @Input()
  index: number;

  operatingConditionsForm: FormGroup;
  utilityDataFormsArr: Array<UtilityDataForm>;
    facilityUnits: string;
    facilitySub: Subscription;
  
  constructor(private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService,
      private facilityDbService: FacilitydbService
  ) { }

  ngOnInit() {
    this.setForm();
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facilityUnits = facility?.energyUnit;
    });
  }

  setForm() {
    let operatingConditionsData: EnergyEquipmentOperatingConditionsData = this.equipment.operatingConditionsData ? this.equipment.operatingConditionsData.find(data => data.year == this.year) : null;
    this.operatingConditionsForm = this.facilityEnergyUseEquipmentFormService.getOperatingConditionsYearForm(operatingConditionsData);
    this.utilityDataFormsArr = this.facilityEnergyUseEquipmentFormService.getUtilityDataFormsFromEnergyUseEquipment(this.equipment);
  }

  toggleOverride(energyUseForm: FormGroup) {
    energyUseForm.patchValue({
      overrideEnergyUse: !energyUseForm.controls.overrideEnergyUse.value
    });
    if (energyUseForm.controls.overrideEnergyUse.value) {
      energyUseForm.controls.energyUse.enable();
    } else {
      energyUseForm.controls.energyUse.disable();
    }
  }
}
