import { Component, Input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { getEmissions, getZeroEmissionsResults } from 'src/app/calculations/emissions-calculations/emissions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { IdbCustomFuel, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getMobileFuelTypes } from 'src/app/shared/fuel-options/getFuelTypeOptions';

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
  @Input()
  displayVehicleFuelEfficiency: boolean;

  source: MeterSource;
  energyUnit: string;
  volumeUnit: string;
  isBiofuel: boolean;
  emissionsValues: EmissionsResults;
  meterFuel: FuelTypeOption;
  totalVolumeLabel: 'Total Fuel Consumption' | 'Total Distance';
  usingMeterFuelEfficiency: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private customFuelDbService: CustomFuelDbService) {
  }

  ngOnInit(): void {
    this.setFuel();
    this.setTotalEmissions();
    this.setUsingMeterFuelEfficiency();
  }

  ngOnChanges() {
    this.source = this.editMeter.source;
    this.energyUnit = this.editMeter.energyUnit;
    if (this.editMeter.vehicleCollectionType == 1) {
      this.totalVolumeLabel = 'Total Fuel Consumption';
      this.volumeUnit = this.editMeter.vehicleCollectionUnit;
      if (this.editMeter.vehicleCategory == 2) {
        this.meterDataForm.addControl('totalDistance', new FormControl());
        this.meterDataForm.controls.totalDistance.disable();
        this.setTotalDistance();
      }
    } else {
      this.totalVolumeLabel = 'Total Distance';
      this.volumeUnit = this.editMeter.vehicleDistanceUnit;
      if (this.editMeter.vehicleCategory == 2) {
        this.meterDataForm.addControl('totalFuelConsumption', new FormControl());
        this.meterDataForm.controls.totalFuelConsumption.disable();
        this.setTotalFuelConsumption();
      }
    }
    this.checkDate();
    this.setFuel();
    this.setTotalEmissions();
  }

  setFuel() {
    let allFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    let mobileTypeFuels: Array<FuelTypeOption> = getMobileFuelTypes(this.editMeter.vehicleCategory, this.editMeter.vehicleType, allFuels)
    this.meterFuel = mobileTypeFuels.find(fuel => {
      return fuel.value == this.editMeter.vehicleFuel;
    });
  }

  calculateTotalEnergyUse() {
    let totalEnergyUse: number;
    if (this.editMeter.vehicleCollectionType == 1) {
      this.setTotalDistance();
      totalEnergyUse = this.meterDataForm.controls.totalVolume.value * this.editMeter.heatCapacity
    } else {
      //total volume = distance
      this.setTotalFuelConsumption();
      totalEnergyUse = this.meterDataForm.controls.totalFuelConsumption.value * this.editMeter.heatCapacity;
    }
    this.meterDataForm.controls.totalEnergyUse.patchValue(totalEnergyUse);
    this.setTotalEmissions();
  }

  setTotalFuelConsumption() {
    if (this.editMeter.vehicleCategory == 2) {
      let fuelConsumption: number = this.meterDataForm.controls.totalVolume.value / this.meterDataForm.controls.vehicleFuelEfficiency.value;
      this.meterDataForm.controls.totalFuelConsumption.patchValue(fuelConsumption);
    }
  }

  setTotalDistance() {
    if (this.editMeter.vehicleCategory == 2) {
      let totalDistance: number = this.meterDataForm.controls.totalVolume.value * this.meterDataForm.controls.vehicleFuelEfficiency.value;
      this.meterDataForm.controls.totalDistance.patchValue(totalDistance);
    }
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
      let allFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
      this.emissionsValues = getEmissions(this.editMeter, this.meterDataForm.controls.totalEnergyUse.value, this.editMeter.energyUnit,
        new Date(this.meterDataForm.controls.readDate.value).getFullYear(), false, [facility], [], allFuels,
        this.meterDataForm.controls.totalVolume.value, this.editMeter.vehicleCollectionUnit, this.editMeter.vehicleDistanceUnit, this.meterDataForm.controls.vehicleFuelEfficiency.value);
    } else {
      this.emissionsValues = getZeroEmissionsResults();
    }
  }

  editFuelEfficiency() {
    this.meterDataForm.controls.vehicleFuelEfficiency.enable();
    this.usingMeterFuelEfficiency = false;
    this.calculateTotalEnergyUse();
  }

  useMeterFuelEfficiency() {
    this.meterDataForm.controls.vehicleFuelEfficiency.patchValue(this.editMeter.vehicleFuelEfficiency);
    this.meterDataForm.controls.vehicleFuelEfficiency.disable();
    this.usingMeterFuelEfficiency = true;
    this.calculateTotalEnergyUse();
  }

  setUsingMeterFuelEfficiency() {
    this.usingMeterFuelEfficiency = (this.meterDataForm.controls.vehicleFuelEfficiency.value == this.editMeter.vehicleFuelEfficiency);
    if (!this.usingMeterFuelEfficiency) {
      this.meterDataForm.controls.vehicleFuelEfficiency.enable();
    }
  }
}
