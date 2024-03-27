import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbCustomFuel, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { getEmissions, getZeroEmissionsResults } from 'src/app/calculations/emissions-calculations/emissions';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import * as _ from 'lodash';
import { checkShowEmissionsOutputRate } from 'src/app/shared/sharedHelperFuntions';

@Component({
  selector: 'app-edit-utility-bill',
  templateUrl: './edit-utility-bill.component.html',
  styleUrls: ['./edit-utility-bill.component.css']
})
export class EditUtilityBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;
  @Input()
  displayVolumeInput: boolean;
  @Input()
  displayEnergyUse: boolean;
  @Input()
  invalidDate: boolean;
  @Input()
  displayHeatCapacity: boolean;

  energyUnit: string;
  source: MeterSource;
  volumeUnit: string;
  emissionsResults: EmissionsResults;
  showEmissions: boolean;
  showMarketEmissions: boolean;
  showStationaryEmissions: boolean;
  showScope2OtherEmissions: boolean;
  usingMeterHeatCapacity: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.setShowEmissions();
    this.setTotalEmissions();
    this.setUsingMeterHeatCapacity();
  }

  ngOnChanges() {
    this.source = this.editMeter.source;
    this.energyUnit = this.editMeter.energyUnit;
    this.volumeUnit = this.editMeter.startingUnit;
    this.checkDate();
    this.setShowEmissions();
    this.setTotalEmissions();
  }

  setShowEmissions() {
    this.showEmissions = checkShowEmissionsOutputRate(this.editMeter);
    this.showMarketEmissions = this.editMeter.source == 'Electricity';
    this.showStationaryEmissions = this.editMeter.source == 'Natural Gas' || this.editMeter.source == 'Other Fuels';
    this.showScope2OtherEmissions = this.editMeter.source == 'Other Energy';
  }

  calculateTotalEnergyUse() {
    let totalEnergyUse: number = this.meterDataForm.controls.totalVolume.value * this.meterDataForm.controls.heatCapacity.value;
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
    if ((this.meterDataForm.controls.totalEnergyUse.value || this.meterDataForm.controls.totalVolume.value) && this.showEmissions) {
      let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
      //meed to use total volume for fugitive/process emissions
      this.emissionsResults = getEmissions(this.editMeter,
        this.meterDataForm.controls.totalEnergyUse.value,
        this.editMeter.energyUnit,
        new Date(this.meterDataForm.controls.readDate.value).getFullYear(),
        false, [facility], this.eGridService.co2Emissions, customFuels,
        this.meterDataForm.controls.totalVolume.value, undefined, undefined,
        this.meterDataForm.controls.heatCapacity.value);
    } else {
      this.emissionsResults = getZeroEmissionsResults();
    }
  }

  editHeatCapacity() {
    this.meterDataForm.controls.heatCapacity.enable();
    this.usingMeterHeatCapacity = false;
    this.calculateTotalEnergyUse();
  }

  useMeterHeatCapacity() {
    this.meterDataForm.controls.heatCapacity.patchValue(this.editMeter.heatCapacity);
    this.meterDataForm.controls.heatCapacity.disable();
    this.usingMeterHeatCapacity = true;
    this.calculateTotalEnergyUse();
  }

  setUsingMeterHeatCapacity() {
    this.usingMeterHeatCapacity = (this.meterDataForm.controls.heatCapacity.value == this.editMeter.heatCapacity);
    if (!this.usingMeterHeatCapacity) {
      this.meterDataForm.controls.heatCapacity.enable();
    }
  }
}
