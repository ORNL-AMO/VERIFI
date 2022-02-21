import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private router: Router,
    private toastNotificationsService: ToastNotificationsService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    if (facilityMeterData.length == 0) {
      this.toastNotificationsService.showToast("Meter Data Needed", "Meter data must be entered before conducting anaylsis.", undefined, false, "error");
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.router.navigateByUrl("facility/" + selectedFacility.id + "/utility");
    }
  }

}
