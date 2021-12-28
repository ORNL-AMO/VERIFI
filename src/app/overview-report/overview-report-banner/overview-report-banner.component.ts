import { Component, OnInit } from '@angular/core';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-banner',
  templateUrl: './overview-report-banner.component.html',
  styleUrls: ['./overview-report-banner.component.css']
})
export class OverviewReportBannerComponent implements OnInit {

  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
  }


  toggleReportMenu(){
    let showReportMenu: boolean = this.overviewReportService.showReportMenu.getValue();
    this.overviewReportService.showReportMenu.next(!showReportMenu);
  }

  print(){
    this.overviewReportService.print.next(true);
  }
}
