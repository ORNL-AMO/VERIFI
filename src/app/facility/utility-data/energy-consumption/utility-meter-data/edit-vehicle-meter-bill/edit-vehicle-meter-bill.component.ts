import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
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
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) {
  }

  ngOnInit(): void {
    this.setFuel();
    this.setTotalEmissions();
  }

  ngOnChanges() {
    this.source = this.editMeter.source;
    this.energyUnit = this.editMeter.energyUnit;
    this.volumeUnit = this.editMeter.vehicleCollectionUnit;
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
      if (this.editMeter.vehicleCategory != 2 || this.editMeter.vehicleCollectionType == 1) {
        if (this.meterFuel.isBiofuel) {
          this.biogenicEmissions = this.meterDataForm.controls.totalVolume.value * this.meterFuel.CO2;
          this.carbonEmissions = 0;
        } else {
          this.carbonEmissions = this.meterDataForm.controls.totalVolume.value * this.meterFuel.CO2;
          this.biogenicEmissions = 0;
        }
      } else {
        if (this.meterFuel.isBiofuel) {
          this.biogenicEmissions = this.meterDataForm.controls.totalVolume.value * this.editMeter.vehicleFuelEfficiency * this.meterFuel.CO2;
          this.carbonEmissions = 0;
        } else {
          this.carbonEmissions = this.meterDataForm.controls.totalVolume.value * this.editMeter.vehicleFuelEfficiency * this.meterFuel.CO2;
          this.biogenicEmissions = 0;
        }
      }
      this.otherEmissions = (25 * this.meterDataForm.controls.totalVolume.value * this.meterFuel.CH4) + (298 * this.meterDataForm.controls.totalVolume.value * this.meterFuel.N2O);
      this.totalEmissions = this.otherEmissions + this.carbonEmissions + this.biogenicEmissions;
    } else {
      this.carbonEmissions = 0;
      this.biogenicEmissions = 0;
      this.otherEmissions = 0;
      this.totalEmissions = this.carbonEmissions + this.biogenicEmissions + this.otherEmissions;
    }
  }
}
