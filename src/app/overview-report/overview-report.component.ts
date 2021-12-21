import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { OverviewReportService, ReportOptions } from './overview-report.service';

@Component({
  selector: 'app-overview-report',
  templateUrl: './overview-report.component.html',
  styleUrls: ['./overview-report.component.css']
})
export class OverviewReportComponent implements OnInit {

  showReportMenu: boolean;
  showReportMenuSub: Subscription;
  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.overviewReportService.initializeOptions();
    
    this.showReportMenuSub = this.overviewReportService.showReportMenu.subscribe(showReportMenu => {
      this.showReportMenu = showReportMenu;
    });
    
    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
    });
  }

  ngOnDestroy() {
    this.showReportMenuSub.unsubscribe();
    this.reportOptionsSub.unsubscribe();
  }

}
