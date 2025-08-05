import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-report-setup-help',
  standalone: false,
  templateUrl: './facility-report-setup-help.component.html',
  styleUrl: './facility-report-setup-help.component.css'
})
export class FacilityReportSetupHelpComponent {

  selectedReport: IdbFacilityReport;
  selectedReportSub: Subscription;
  constructor(private facilityReportDbService: FacilityReportsDbService) {
  }

  ngOnInit() {
    this.selectedReportSub = this.facilityReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
    });
  }

  ngOnDestroy(){
    this.selectedReportSub.unsubscribe();
  }
}
