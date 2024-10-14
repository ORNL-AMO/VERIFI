import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-analysis-report-setup',
  templateUrl: './facility-analysis-report-setup.component.html',
  styleUrl: './facility-analysis-report-setup.component.css'
})
export class FacilityAnalysisReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription
  constructor(private facilityReportsDbService: FacilityReportsDbService){  }

  ngOnInit(){
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(selectedReport => {
      this.facilityReport = selectedReport;
      console.log(this.facilityReport);
    });
  }

  ngOnDestroy(){
    this.facilityReportSub.unsubscribe();
  }
}
