import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EnergyUnitOptions, SizeUnitOptions, SolidMassOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { IdbFacility } from 'src/app/models/idb';

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
    massSolidUnit: new FormControl('', [Validators.required]),
    volumeLiquidUnit: new FormControl('', [Validators.required]),
    volumeGasUnit: new FormControl('', [Validators.required]),
    chilledWaterUnit: new FormControl('', [Validators.required]),
  });

  selectedFacilitySub: Subscription;


  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  volumeGasOptions: Array<UnitOption> = VolumeGasOptions;
  volumeLiquidOptions: Array<UnitOption> = VolumeLiquidOptions;
  sizeUnitOptions: Array<UnitOption> = SizeUnitOptions;
  solidMassOptions: Array<UnitOption> = SolidMassOptions;
  selectedFacility: IdbFacility;
  constructor(private facilitydbService: FacilitydbService) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
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
        this.facilityForm.controls.massSolidUnit.setValue(facility.massSolidUnit);
        this.facilityForm.controls.volumeLiquidUnit.setValue(facility.volumeLiquidUnit);
        this.facilityForm.controls.volumeGasUnit.setValue(facility.volumeGasUnit);
        this.facilityForm.controls.chilledWaterUnit.setValue(facility.chilledWaterUnit);
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  onFormChange(): void {
    // Update db
    this.checkCustom();
    //TODO: stop using .value, remove ids from form
    this.facilitydbService.update(this.facilityForm.value);
  }

  checkCustom() {
    let selectedEnergyOption: UnitOption = this.energyUnitOptions.find(option => { return option.value == this.facilityForm.controls.energyUnit.value });
    let selectedVolumeGasOption: UnitOption = this.volumeGasOptions.find(option => { return option.value == this.facilityForm.controls.volumeUnit.value });
    let selectedVolumeLiquidOption: UnitOption = this.volumeLiquidOptions.find(option => { return option.value == this.facilityForm.controls.volumeUnit.value });
    // let selectedSizeOption: UnitOption = this.sizeUnitOptions.find(option => { return option.value == this.facilityForm.controls.sizeUnit.value });
    let selectedMassOption: UnitOption = this.solidMassOptions.find(option => { return option.value == this.facilityForm.controls.massUnit.value });
    if (selectedEnergyOption.unitsOfMeasure == 'Metric' && selectedVolumeLiquidOption.unitsOfMeasure == 'Metric' && selectedVolumeGasOption.unitsOfMeasure == 'Metric' && selectedMassOption.unitsOfMeasure == 'Metric') {
      this.facilityForm.controls.unitsOfMeasure.patchValue('Metric');
    } else if (selectedEnergyOption.unitsOfMeasure == 'Imperial' && selectedVolumeLiquidOption.unitsOfMeasure == 'Imperial' && selectedVolumeGasOption.unitsOfMeasure == 'Imperial' && selectedMassOption.unitsOfMeasure == 'Imperial') {
      this.facilityForm.controls.unitsOfMeasure.patchValue('Imperial');
    } else {
      this.facilityForm.controls.unitsOfMeasure.patchValue('Custom');
    }
  }

  setUnitsOfMeasure() {
    if (this.facilityForm.controls.unitsOfMeasure.value == 'Imperial') {
      this.facilityForm.controls.energyUnit.setValue('kWh');
      this.facilityForm.controls.volumeLiquidUnit.setValue('ft3');
      this.facilityForm.controls.volumeGasUnit.setValue('ft3');
      this.facilityForm.controls.massSolidUnit.setValue('lb');
    } else if (this.facilityForm.controls.unitsOfMeasure.value == 'Metric') {
      this.facilityForm.controls.energyUnit.setValue('MMBtu');
      this.facilityForm.controls.volumeLiquidUnit.setValue('m3');
      this.facilityForm.controls.volumeGasUnit.setValue('m3');
      this.facilityForm.controls.massSolidUnit.setValue('kg');
    }
    this.onFormChange();
  }

}
