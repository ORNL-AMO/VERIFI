import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EnergyUnitOptions, MassUnitOptions, SizeUnitOptions, UnitOption, VolumeUnitOptions } from 'src/app/shared/unitOptions';

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {
  facilityId: number;
  facilityForm: FormGroup = new FormGroup({
    id: new FormControl('', [Validators.required]),
    accountId: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    country: new FormControl('', [Validators.required]),
    state: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required]),
    type: new FormControl('', [Validators.required]),
    tier: new FormControl('', [Validators.required]),
    size: new FormControl('', [Validators.required]),
    // units: new FormControl('', [Validators.required]),
    division: new FormControl('', [Validators.required]),
    unitsOfMeasure: new FormControl('', [Validators.required]),
    energyUnit: new FormControl('', [Validators.required]),
    volumeUnit: new FormControl('', [Validators.required]),
    sizeUnit: new FormControl('', [Validators.required]),
    massUnit: new FormControl('', [Validators.required])
  });

  selectedFacilitySub: Subscription;


  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  volumeUnitOptions: Array<UnitOption> = VolumeUnitOptions;
  sizeUnitOptions: Array<UnitOption> = SizeUnitOptions;
  massUnitOptions: Array<UnitOption> = MassUnitOptions;
  constructor(private facilitydbService: FacilitydbService) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      if (facility != null) {
        this.facilityForm.controls.id.setValue(facility.id);
        this.facilityForm.controls.accountId.setValue(facility.accountId);
        this.facilityForm.controls.name.setValue(facility.name);
        this.facilityForm.controls.country.setValue(facility.country);
        this.facilityForm.controls.state.setValue(facility.state);
        this.facilityForm.controls.address.setValue(facility.address);
        this.facilityForm.controls.type.setValue(facility.type);
        this.facilityForm.controls.tier.setValue(facility.tier);
        this.facilityForm.controls.size.setValue(facility.size);
        this.facilityForm.controls.division.setValue(facility.division);
        // Needs image
        this.facilityForm.controls.unitsOfMeasure.setValue(facility.unitsOfMeasure);
        this.facilityForm.controls.energyUnit.setValue(facility.energyUnit);
        this.facilityForm.controls.volumeUnit.setValue(facility.volumeUnit);
        this.facilityForm.controls.sizeUnit.setValue(facility.sizeUnit);
        this.facilityForm.controls.massUnit.setValue(facility.massUnit);
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  onFormChange(): void {
    // Update db
    this.checkCustom();
    this.facilitydbService.update(this.facilityForm.value);
  }

  checkCustom() {
    let selectedEnergyOption: UnitOption = this.energyUnitOptions.find(option => { return option.value == this.facilityForm.controls.energyUnit.value });
    let selectedVolumeOption: UnitOption = this.volumeUnitOptions.find(option => { return option.value == this.facilityForm.controls.volumeUnit.value });
    let selectedSizeOption: UnitOption = this.sizeUnitOptions.find(option => { return option.value == this.facilityForm.controls.sizeUnit.value });
    let selectedMassOption: UnitOption = this.massUnitOptions.find(option => { return option.value == this.facilityForm.controls.massUnit.value });
    if (selectedEnergyOption.unitsOfMeasure == 'Metric' && selectedVolumeOption.unitsOfMeasure == 'Metric' && selectedSizeOption.unitsOfMeasure == 'Metric' && selectedMassOption.unitsOfMeasure == 'Metric') {
      this.facilityForm.controls.unitsOfMeasure.patchValue('Metric');
    } else if (selectedEnergyOption.unitsOfMeasure == 'Imperial' && selectedVolumeOption.unitsOfMeasure == 'Imperial' && selectedSizeOption.unitsOfMeasure == 'Imperial' && selectedMassOption.unitsOfMeasure == 'Imperial') {
      this.facilityForm.controls.unitsOfMeasure.patchValue('Imperial');
    } else {
      this.facilityForm.controls.unitsOfMeasure.patchValue('Custom');
    }
  }

  setUnitsOfMeasure() {
    if (this.facilityForm.controls.unitsOfMeasure.value == 'Imperial') {
      this.facilityForm.controls.energyUnit.setValue('kWh');
      this.facilityForm.controls.volumeUnit.setValue('gal');
      this.facilityForm.controls.sizeUnit.setValue('ft');
      this.facilityForm.controls.massUnit.setValue('lb');
    } else if (this.facilityForm.controls.unitsOfMeasure.value == 'Metric') {
      this.facilityForm.controls.energyUnit.setValue('MMBtu');
      this.facilityForm.controls.volumeUnit.setValue('m3');
      this.facilityForm.controls.sizeUnit.setValue('km');
      this.facilityForm.controls.massUnit.setValue('kg');
    }
    this.onFormChange();
  }

}
