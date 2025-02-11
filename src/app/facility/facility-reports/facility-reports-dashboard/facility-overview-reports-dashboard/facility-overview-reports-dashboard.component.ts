import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
    selector: 'app-facility-overview-reports-dashboard',
    templateUrl: './facility-overview-reports-dashboard.component.html',
    styleUrl: './facility-overview-reports-dashboard.component.css',
    standalone: false
})
export class FacilityOverviewReportsDashboardComponent {


  facilityReportsSub: Subscription;
  facilityReports: Array<IdbFacilityReport>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
    this.facilityReportsSub = this.facilityReportsDbService.facilityReports.subscribe(reports => {
      this.facilityReports = reports.filter(report => {
        return report.facilityReportType == 'overview';
      });
    });
  }

  ngOnDestroy() {
    this.facilityReportsSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }
}
