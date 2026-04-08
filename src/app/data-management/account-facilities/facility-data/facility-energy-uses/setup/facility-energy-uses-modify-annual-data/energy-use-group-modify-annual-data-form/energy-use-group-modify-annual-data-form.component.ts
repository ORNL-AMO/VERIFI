import { Component, Input } from '@angular/core';
import { EnergyEquipmentOperatingConditionsData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from '../../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';
import { FormGroup } from '@angular/forms';
import { distinctUntilChanged, Subscription } from 'rxjs';
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
  formSubscriptions: Subscription = new Subscription();

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
    this.subscribeToFormChanges();
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

  subscribeToFormChanges() {
    this.formSubscriptions.unsubscribe();
    this.formSubscriptions = new Subscription();
    this.formSubscriptions.add(
      this.operatingConditionsForm.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
        this.saveChanges();
      }));
    this.utilityDataFormsArr.forEach(udf => {
      udf.energyUseForms.forEach(euf => {
        this.formSubscriptions.add(
          euf.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
            this.saveChanges();
          }));
      });
    });
  }

  saveChanges() {
    this.facilityEnergyUseEquipmentFormService.calculateEnergyUse(this.utilityDataFormsArr, [this.operatingConditionsForm]);

    this.equipment.operatingConditionsData = this.equipment.operatingConditionsData.map(data => {
      if (data.year == this.year) {
        return {
          year: this.year,
          hoursOfOperation: this.operatingConditionsForm.controls['hoursOfOperation'].value,
          loadFactor: this.operatingConditionsForm.controls['loadFactor'].value,
          dutyFactor: this.operatingConditionsForm.controls['dutyFactor'].value,
          efficiency: this.operatingConditionsForm.controls['efficiency'].value,
        }
      } else {
        return data;
      }
    });

    this.equipment.utilityData = this.equipment.utilityData.map(utility => {
      let utilityDataFormObj = this.utilityDataFormsArr.find(udf => udf.energySource == utility.energySource);
      if (utilityDataFormObj) {
        utility.energyUse = utility.energyUse.map(eu => {
          let energyUseForm = utilityDataFormObj.energyUseForms.find(euf => euf.controls.year.value == eu.year);
          if (energyUseForm) {
            return {
              year: eu.year,
              energyUse: energyUseForm.controls['energyUse'].value,
              overrideEnergyUse: energyUseForm.controls['overrideEnergyUse'].value
            }
          } else {
            return eu;
          }
        });
        return utility;
      } else {
        return utility;
      }
    });

  }
}
