import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbCustomFuel, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { getEmissions } from 'src/app/calculations/emissions-calculations/emissions';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-edit-other-emissions-bill',
  templateUrl: './edit-other-emissions-bill.component.html',
  styleUrls: ['./edit-other-emissions-bill.component.css']
})
export class EditOtherEmissionsBillComponent {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;
  @Input()
  invalidDate: boolean;


  volumeUnit: string;
  fugitiveEmissions: number = 0;
  processEmissions: number = 0;
  totalLabel: 'Total Refrigerant Lost' | 'Total Process Emissions';
  displayFugitiveTableModal: boolean = false;
  showCopyLast: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.setTotalEmissions();
    this.setShowCopyLast();

  }

  ngOnChanges() {
    this.volumeUnit = this.editMeter.startingUnit;
    this.checkDate();
    this.setTotalEmissions();
    this.setTotalLabel();
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
    if (this.meterDataForm.controls.totalVolume.value) {
      let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
      //meed to use total volume for fugitive/process emissions
      let emissionsValues: EmissionsResults = getEmissions(this.editMeter,
        this.meterDataForm.controls.totalEnergyUse.value,
        this.editMeter.energyUnit,
        new Date(this.meterDataForm.controls.readDate.value).getFullYear(),
        false, [facility], this.eGridService.co2Emissions, customFuels,
        this.meterDataForm.controls.totalVolume.value, undefined, undefined, undefined);
      this.fugitiveEmissions = emissionsValues.fugitiveEmissions;
      this.processEmissions = emissionsValues.processEmissions;
    } else {
      this.fugitiveEmissions = 0;
      this.processEmissions = 0;
    }
  }

  setTotalLabel() {
    if (this.editMeter.scope == 5) {
      this.totalLabel = 'Total Refrigerant Lost';
    } else if (this.editMeter.scope == 6) {
      this.totalLabel = 'Total Process Emissions';
    }
  }

  showFugitiveEmissionsTable() {
    this.displayFugitiveTableModal = true;
  }

  hideFugitiveTableModal() {
    this.displayFugitiveTableModal = false;
  }

  setShowCopyLast() {
    let allSelectedMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.editMeter.guid);
    this.showCopyLast = (allSelectedMeterData.length != 0);
  }

  copyLastReading() {
    let allSelectedMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.editMeter.guid);
    allSelectedMeterData = _.orderBy(allSelectedMeterData, 'readDate');
    let lastReading: IdbUtilityMeterData = allSelectedMeterData[allSelectedMeterData.length - 1];
    this.meterDataForm.controls.totalVolume.patchValue(lastReading.totalVolume);
    this.setTotalEmissions();
  }
}
