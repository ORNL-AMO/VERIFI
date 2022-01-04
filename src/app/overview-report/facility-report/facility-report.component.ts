import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-facility-report',
  templateUrl: './facility-report.component.html',
  styleUrls: ['./facility-report.component.css']
})
export class FacilityReportComponent implements OnInit {
  @Input()
  facility: IdbFacility;

  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
    });
  }

  ngOnDestroy(){
    this.reportOptionsSub.unsubscribe();
  }

}
