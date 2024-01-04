import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { getEmissions } from 'src/app/calculations/emissions-calculations/emissions';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getAllMobileFuelTypes } from 'src/app/shared/fuel-options/getFuelTypeOptions';

@Component({
  selector: 'app-edit-vehicle-meter-bill',
  templateUrl: './edit-vehicle-meter-bill.component.html',
  styleUrls: ['./edit-vehicle-meter-bill.component.css']
})
export class EditVehicleMeterBillComponent {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;
  @Input()
  displayEnergyUse: boolean;
  @Input()
  invalidDate: boolean;

  source: MeterSource;
  energyUnit: string;
  volumeUnit: string;
  isBiofuel: boolean;
  carbonEmissions: number = 0;
  biogenicEmissions: number = 0;
  otherEmissions: number = 0;
  totalEmissions: number = 0;
  meterFuel: FuelTypeOption;
  totalVolumeLabel: 'Total Fuel Usage' | 'Total Distance';
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService) {
  }

  ngOnInit(): void {
    this.setFuel();
    this.setTotalEmissions();
  }

  ngOnChanges() {
    this.source = this.editMeter.source;
    this.energyUnit = this.editMeter.energyUnit;
    if (this.editMeter.vehicleCollectionType == 1) {
      this.totalVolumeLabel = 'Total Fuel Usage';
      this.volumeUnit = this.editMeter.vehicleCollectionUnit;
    } else {
      this.totalVolumeLabel = 'Total Distance';
      this.volumeUnit = this.editMeter.vehicleDistanceUnit;
    }
    this.checkDate();
    this.setFuel();
    this.setTotalEmissions();
  }

  setFuel() {
    let mobileTypeFuels: Array<FuelTypeOption> = getAllMobileFuelTypes();
    this.meterFuel = mobileTypeFuels.find(fuel => {
      return fuel.value == this.editMeter.vehicleFuel;
    });
  }

  calculateTotalEnergyUse() {
    let totalEnergyUse: number;
    let totalVolume: number = this.meterDataForm.controls.totalVolume.value;
    if (this.editMeter.vehicleCollectionType == 1) {
      totalEnergyUse = totalVolume * this.editMeter.heatCapacity
    } else {
      let fuelConsumption: number = totalVolume / this.editMeter.vehicleFuelEfficiency;
      totalEnergyUse = fuelConsumption * this.editMeter.heatCapacity;
    }
    // let totalEnergyUse: number = * this.editMeter.heatCapacity;
    this.meterDataForm.controls.totalEnergyUse.patchValue(totalEnergyUse);
    this.setTotalEmissions();
  }

  checkDate() {
    if (this.addOrEdit == 'add') {
      //new meter entry should have any year/month combo of existing meter reading
      this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter) != undefined;
    } else {
      //edit meter needs to allow year/month combo of the meter being edited
      let currentMeterItemDate: Date = new Date(this.editMeterData.readDate);
      let changeDate: Date = new Date(this.meterDataForm.controls.readDate.value);
      if (currentMeterItemDate.getUTCFullYear() == changeDate.getUTCFullYear() && currentMeterItemDate.getUTCMonth() == changeDate.getUTCMonth() && currentMeterItemDate.getUTCDate() == changeDate.getUTCDate()) {
        this.invalidDate = false;
      } else {
        this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter) != undefined;
      }
    }
  }

  setTotalEmissions() {
    if (this.meterDataForm.controls.totalVolume.value) {
      let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let emissionsValues: EmissionsResults = getEmissions(this.editMeter, this.meterDataForm.controls.totalEnergyUse.value, this.editMeter.energyUnit, new Date(this.meterDataForm.controls.readDate.value).getFullYear(), false, [facility], [], [], this.meterDataForm.controls.totalVolume.value, this.editMeter.vehicleCollectionUnit, this.editMeter.vehicleDistanceUnit);
      this.carbonEmissions = emissionsValues.mobileCarbonEmissions;
      this.biogenicEmissions = emissionsValues.mobileBiogenicEmissions;
      this.otherEmissions = emissionsValues.mobileOtherEmissions;
      this.totalEmissions = emissionsValues.mobileTotalEmissions;
    } else {
      this.carbonEmissions = 0;
      this.biogenicEmissions = 0;
      this.otherEmissions = 0;
      this.totalEmissions = 0;
    }
  }
}
