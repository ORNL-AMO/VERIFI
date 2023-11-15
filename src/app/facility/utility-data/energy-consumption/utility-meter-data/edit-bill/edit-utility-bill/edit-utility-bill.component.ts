import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbCustomFuel, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EditMeterFormService } from '../../../energy-source/edit-meter-form/edit-meter-form.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { getEmissions } from 'src/app/calculations/emissions-calculations/emissions';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';

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

  energyUnit: string;
  source: MeterSource;
  volumeUnit: string;
  marketEmissions: number = 0;
  locationEmissions: number = 0;
  showEmissions: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService, private editMeterFormService: EditMeterFormService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.showEmissions = this.editMeterFormService.checkShowEmissionsOutputRate(this.editMeter);
    this.setTotalEmissions();
  }

  ngOnChanges() {
    this.source = this.editMeter.source;
    this.energyUnit = this.editMeter.energyUnit;
    this.volumeUnit = this.editMeter.startingUnit;
    this.checkDate();
    this.setTotalEmissions();
  }

  calculateTotalEnergyUse() {
    let totalEnergyUse: number = this.meterDataForm.controls.totalVolume.value * this.editMeter.heatCapacity;
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
    if (this.meterDataForm.controls.totalEnergyUse.value && this.showEmissions) {
      let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
      let emissionsValues: EmissionsResults = getEmissions(this.editMeter, this.meterDataForm.controls.totalEnergyUse.value, this.editMeter.energyUnit, new Date(this.meterDataForm.controls.readDate.value).getFullYear(), false, [facility], this.eGridService.co2Emissions, customFuels, 0, undefined, undefined);
      this.marketEmissions = emissionsValues.marketEmissions;
      this.locationEmissions = emissionsValues.locationEmissions;
    } else {
      this.marketEmissions = 0;
      this.locationEmissions = 0;
    }
  }

}
