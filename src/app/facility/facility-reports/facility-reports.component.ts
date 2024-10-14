import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-facility-reports',
  templateUrl: './facility-reports.component.html',
  styleUrl: './facility-reports.component.css'
})
export class FacilityReportsComponent {


  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  facilityReportsSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private facilityReportsDbService: FacilityReportsDbService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });

    this.facilityReportsSub = this.facilityReportsDbService.facilityReports.subscribe(facilityReports => {
      console.log(facilityReports);
    })
  }


  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
  }

  goToUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility')
  }
}
