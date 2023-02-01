import { Component, Input } from '@angular/core';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewFacility } from '../data-overview-report.component';

@Component({
  selector: 'app-data-overview-facility-report',
  templateUrl: './data-overview-facility-report.component.html',
  styleUrls: ['./data-overview-facility-report.component.css']
})
export class DataOverviewFacilityReportComponent {
  @Input()
  dataOverviewFacility: DataOverviewFacility;
  @Input()
  overviewReport: DataOverviewReportSetup;

  constructor() { }

  ngOnInit(): void {
   
  }
}
