import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EnergyUnitOptions, SizeUnitOptions, SolidMassOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { IdbFacility } from 'src/app/models/idb';
import { PredictordbService } from "../../indexedDB/predictors-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { LoadingService } from "../../shared/loading/loading.service";

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {
  facilityId: number;
  showDeleteFacility: boolean = false;

  facilityForm = new FormGroup({
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

  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService
  ) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
      if (facility != null) {
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
    this.updateSelectedFacility();
    //TODO: stop using .value, remove ids from form
    this.facilityDbService.update(this.selectedFacility);
  }

  updateSelectedFacility() {
    this.selectedFacility.name = this.facilityForm.controls.name.value;
    this.selectedFacility.country = this.facilityForm.controls.country.value;
    this.selectedFacility.address = this.facilityForm.controls.address.value;
    this.selectedFacility.type = this.facilityForm.controls.type.value;
    this.selectedFacility.tier = this.facilityForm.controls.tier.value;
    this.selectedFacility.size = this.facilityForm.controls.size.value;
    this.selectedFacility.division = this.facilityForm.controls.division.value;
    this.selectedFacility.unitsOfMeasure = this.facilityForm.controls.unitsOfMeasure.value;
    this.selectedFacility.energyUnit = this.facilityForm.controls.energyUnit.value;
    this.selectedFacility.massSolidUnit = this.facilityForm.controls.massSolidUnit.value;
    this.selectedFacility.volumeGasUnit = this.facilityForm.controls.volumeGasUnit.value;
    this.selectedFacility.volumeLiquidUnit = this.facilityForm.controls.volumeLiquidUnit.value;
    this.selectedFacility.chilledWaterUnit = this.facilityForm.controls.chilledWaterUnit.value;
  }

  facilityDelete() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();

    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Facility...");

    // Delete all info associated with account
    this.predictorDbService.deleteAllFacilityPredictors(selectedFacility.id);
    this.utilityMeterDataDbService.deleteAllFacilityMeterData(selectedFacility.id);
    this.utilityMeterDbService.deleteAllFacilityMeters(selectedFacility.id);
    this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(selectedFacility.id);
    this.facilityDbService.deleteById(selectedFacility.id);

    // Then navigate to another facility
    this.facilityDbService.setSelectedFacility();
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);

  }

  editFacility() {
    this.showDeleteFacility = true;
  }

  confirmDelete() {
    this.facilityDelete();
    this.showDeleteFacility = undefined;
  }

  cancelDelete() {
    this.showDeleteFacility = undefined;
  }

  checkCustom() {
    let selectedEnergyOption: UnitOption = this.energyUnitOptions.find(option => { return option.value == this.facilityForm.controls.energyUnit.value });
    let selectedVolumeGasOption: UnitOption = this.volumeGasOptions.find(option => { return option.value == this.facilityForm.controls.volumeGasUnit.value });
    let selectedVolumeLiquidOption: UnitOption = this.volumeLiquidOptions.find(option => { return option.value == this.facilityForm.controls.volumeLiquidUnit.value });
    // let selectedSizeOption: UnitOption = this.sizeUnitOptions.find(option => { return option.value == this.facilityForm.controls.sizeUnit.value });
    let selectedMassOption: UnitOption = this.solidMassOptions.find(option => { return option.value == this.facilityForm.controls.massSolidUnit.value });
    if (selectedEnergyOption && selectedVolumeGasOption && selectedVolumeLiquidOption && selectedMassOption) {
      if (selectedEnergyOption.unitsOfMeasure == 'Metric' && selectedVolumeLiquidOption.unitsOfMeasure == 'Metric' && selectedVolumeGasOption.unitsOfMeasure == 'Metric' && selectedMassOption.unitsOfMeasure == 'Metric') {
        this.facilityForm.controls.unitsOfMeasure.patchValue('Metric');
      } else if (selectedEnergyOption.unitsOfMeasure == 'Imperial' && selectedVolumeLiquidOption.unitsOfMeasure == 'Imperial' && selectedVolumeGasOption.unitsOfMeasure == 'Imperial' && selectedMassOption.unitsOfMeasure == 'Imperial') {
        this.facilityForm.controls.unitsOfMeasure.patchValue('Imperial');
      } else {
        this.facilityForm.controls.unitsOfMeasure.patchValue('Custom');
      }
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
