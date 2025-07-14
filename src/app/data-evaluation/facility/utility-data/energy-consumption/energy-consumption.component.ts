import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-energy-consumption',
    templateUrl: './energy-consumption.component.html',
    styleUrls: ['./energy-consumption.component.css'],
    standalone: false
})
export class EnergyConsumptionComponent implements OnInit {

  utilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;

  meterDataSub: Subscription;
  meterData: Array<IdbUtilityMeterData>
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.utilityMeters = facilityMeters;
    });
    this.meterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(fMeterData => {
      this.meterData = fMeterData;
    })
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.meterDataSub.unsubscribe();
  }
}
