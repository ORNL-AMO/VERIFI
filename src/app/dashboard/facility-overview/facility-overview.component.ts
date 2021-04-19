import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css', '../dashboard.component.css']
})
export class FacilityOverviewComponent implements OnInit {

  utilityMeterFacilityData: Array<IdbUtilityMeterData>;
  utilityMeterDataSub: Subscription;
  
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterFacilityData => {
      this.utilityMeterFacilityData = utilityMeterFacilityData;
    });
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
  }

}
 