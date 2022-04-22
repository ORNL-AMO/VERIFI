import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from './utility-meter-data/utility-meter-data.service';

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css']
})
export class EnergyConsumptionComponent implements OnInit {

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMeterData: Array<IdbUtilityMeterData>;

  facilityMetersSub: Subscription;
  utilityDataSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDataService: UtilityMeterDataService
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.utilityMeters = facilityMeters;
      // this.checkMeterData();
    });

    // this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
    //   this.utilityMeterData = utilityMeterData;
    //   this.checkMeterData();
    // });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    // this.utilityDataSub.unsubscribe();
  }

 

  checkHasErrors(meter: IdbUtilityMeter, facilityMeterData: Array<IdbUtilityMeterData>): string {
    let meterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(data => { return data.meterId == meter.guid });
    let checkDate: { error: Date, warning: Date, missingMonth: Date } = this.utilityMeterDataService.checkForErrors(meterData, meter);
    if (checkDate.error || meterData.length == 0) {
      return 'error';
    } else if (checkDate.warning || checkDate.missingMonth) {
      return 'warning'
    }
    return;
  }

}
