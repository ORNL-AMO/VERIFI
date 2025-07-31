import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-facility-banner',
    templateUrl: './facility-banner.component.html',
    styleUrls: ['./facility-banner.component.css'],
    standalone: false
})
export class FacilityBannerComponent implements OnInit {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  facilityMeterData: Array<IdbUtilityMeterData>;
  facilityMeterDataSub: Subscription;
  constructor(private facilityDbService: FacilitydbService,
     private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.facilityMeterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
  }
}
