import { Component, OnInit } from '@angular/core';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-dashboard',
  templateUrl: './overview-report-dashboard.component.html',
  styleUrls: ['./overview-report-dashboard.component.css']
})
export class OverviewReportDashboardComponent implements OnInit {

  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
  }


  setDefaultReport() {
    this.overviewReportService.initializeOptions();
    this.overviewReportService.reportView.next('menu');
  }
}
