import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-dashboard',
  templateUrl: './overview-report-dashboard.component.html',
  styleUrls: ['./overview-report-dashboard.component.css']
})
export class OverviewReportDashboardComponent implements OnInit {

  constructor(private overviewReportService: OverviewReportService, private router: Router) { }

  ngOnInit(): void {
  }


  setDefaultReport() {
    this.overviewReportService.initializeOptions();
    this.router.navigateByUrl('/overview-report/report-menu');
  }
}
