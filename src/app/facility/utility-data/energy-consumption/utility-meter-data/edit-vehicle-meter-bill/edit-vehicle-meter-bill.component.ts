import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

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
  marketEmissions: number = 0;
  locationEmissions: number = 0;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) {
  }

  ngOnInit(): void {
    // this.showEmissions = this.editMeterFormService.checkShowEmissionsOutputRate(this.editMeter);
    // this.setTotalEmissions();
  }

  ngOnChanges() {
    this.source = this.editMeter.source;
    this.energyUnit = this.editMeter.energyUnit;
    this.volumeUnit = this.editMeter.vehicleCollectionUnit;
    this.checkDate();
    // this.setTotalEmissions();
  }

  calculateTotalEnergyUse() {

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

  }
}
