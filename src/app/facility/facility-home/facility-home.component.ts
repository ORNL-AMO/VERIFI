import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { FacilityHomeService } from './facility-home.service';

@Component({
  selector: 'app-facility-home',
  templateUrl: './facility-home.component.html',
  styleUrls: ['./facility-home.component.css']
})
export class FacilityHomeComponent implements OnInit {

  facilityMeterDataSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private facilityHomeService: FacilityHomeService) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.facilityDbService.selectedFacility.subscribe(val => {
      let selectedFacility: IdbFacility = val;
      this.facilityHomeService.setCalanderizedMeters(selectedFacility);
      this.facilityHomeService.setAnalysisSummary(selectedFacility);
    })
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
  }

}
