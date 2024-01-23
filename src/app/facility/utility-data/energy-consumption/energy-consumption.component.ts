import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css']
})
export class EnergyConsumptionComponent implements OnInit {

  utilityMeters: Array<IdbUtilityMeter>;

  facilityMetersSub: Subscription;
  dataQualityModalOpenSub: Subscription;
  dataQualityModalOpen: boolean;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private sharedDataService: SharedDataService
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.utilityMeters = facilityMeters;
    });

    this.dataQualityModalOpenSub = this.sharedDataService.dataQualityModalOpen.subscribe(val => {
      this.dataQualityModalOpen = val;
    })
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.dataQualityModalOpenSub.unsubscribe();
  }

  closeDataQualityModal(){
    this.sharedDataService.dataQualityModalOpen.next(false);
  }
}
