import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-facility-reports',
    templateUrl: './facility-reports.component.html',
    styleUrl: './facility-reports.component.css',
    standalone: false
})
export class FacilityReportsComponent {


  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });
  }


  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
  }

  goToUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility')
  }
}
