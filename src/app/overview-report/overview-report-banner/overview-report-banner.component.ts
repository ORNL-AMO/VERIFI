import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-banner',
  templateUrl: './overview-report-banner.component.html',
  styleUrls: ['./overview-report-banner.component.css']
})
export class OverviewReportBannerComponent implements OnInit {

  inBasicReport: boolean;
  constructor(private overviewReportService: OverviewReportService, private router: Router) { }

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInBasicReport(event.url);
      }
    });
    this.setInBasicReport(this.router.url);
  }

  goToDashboard() {
    this.router.navigateByUrl('/overview-report/report-dashboard');
  }

  goToMenu() {
    this.router.navigateByUrl('/overview-report/report-menu');
  }

  print() {
    this.overviewReportService.print.next(true);
  }

  setInBasicReport(url: string) {
    this.inBasicReport = url.includes('basic-report');
  }
}
