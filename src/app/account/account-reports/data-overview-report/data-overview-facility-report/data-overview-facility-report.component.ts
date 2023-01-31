import { Component, Input } from '@angular/core';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-data-overview-facility-report',
  templateUrl: './data-overview-facility-report.component.html',
  styleUrls: ['./data-overview-facility-report.component.css']
})
export class DataOverviewFacilityReportComponent {
  @Input()
  facilityId: string;
  @Input()
  overviewReport: DataOverviewReportSetup;
}
