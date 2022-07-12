import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { FacilityHomeService } from './facility-home.service';

@Component({
  selector: 'app-facility-home',
  templateUrl: './facility-home.component.html',
  styleUrls: ['./facility-home.component.css']
})
export class FacilityHomeComponent implements OnInit {

  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  facility: IdbFacility;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private facilityHomeService: FacilityHomeService, private utilityMeterDbService: UtilityMeterdbService,
    private router: Router) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.facilityHomeService.setCalanderizedMeters(this.facility);
      this.facilityHomeService.setAnalysisSummary(this.facility);
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    })
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
  }


  navigateToMeters() {
    this.router.navigateByUrl('facility/' + this.facility.id + '/utility');
  }
}
