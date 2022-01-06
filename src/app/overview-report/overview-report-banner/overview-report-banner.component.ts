import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-banner',
  templateUrl: './overview-report-banner.component.html',
  styleUrls: ['./overview-report-banner.component.css']
})
export class OverviewReportBannerComponent implements OnInit {

  reportView: 'dashboard' | 'menu' | 'report';
  reportViewSub: Subscription;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    // this.reportViewSub = this.overviewReportService.reportView.subscribe(val => {
    //   this.reportView = val;
    // });
  }

  ngOnDestroy() {
    // this.reportViewSub.unsubscribe();
  }


  toggleReportMenu() {
    // let showReportMenu: boolean = this.overviewReportService.showReportMenu.getValue();
    // this.overviewReportService.showReportMenu.next(!showReportMenu);
    // this.overviewReportService.reportView.next('menu');
  }

  print() {
    this.overviewReportService.print.next(true);
  }
}
