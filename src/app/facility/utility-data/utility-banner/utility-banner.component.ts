import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-utility-banner',
  templateUrl: './utility-banner.component.html',
  styleUrls: ['./utility-banner.component.css']
})
export class UtilityBannerComponent implements OnInit {

  utilityMeterData: Array<IdbUtilityMeterData>;
  utilityDataSub: Subscription;

  modalOpen: boolean;
  modalOpenSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.utilityMeterData = utilityMeterData;
    });
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
      console.log(this.modalOpen);
    })
  }

  ngOnDestroy(){
    this.utilityDataSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }
}
