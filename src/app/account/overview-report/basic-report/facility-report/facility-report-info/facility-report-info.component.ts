import { Component, Input, OnInit } from '@angular/core';
import { IdbFacility } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../../../overview-report.service';

@Component({
  selector: 'app-facility-report-info',
  templateUrl: './facility-report-info.component.html',
  styleUrls: ['./facility-report-info.component.css']
})
export class FacilityReportInfoComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  reportOptions: ReportOptions;
  
  naics: string;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.naics = this.overviewReportService.getNAICS(this.facility);
  }
}
