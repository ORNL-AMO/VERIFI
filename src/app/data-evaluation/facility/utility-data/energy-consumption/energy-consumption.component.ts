import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
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
  meterData: Array<IdbUtilityMeterData>;
  facilityId: string;
  facilitySub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facilityId = facility?.guid;
    });
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
    this.facilitySub.unsubscribe();
  }
}
