import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-overview-report',
  templateUrl: './overview-report.component.html',
  styleUrls: ['./overview-report.component.css']
})
export class OverviewReportComponent implements OnInit {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private router: Router,
    private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit(): void {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (accountMeterData.length == 0) {
      this.toastNotificationsService.showToast("Meter Data Needed", "Meter data must be entered before generating reports.", undefined, false, "error");
      this.router.navigateByUrl("account");
    }
  }
}
