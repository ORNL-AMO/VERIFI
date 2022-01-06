import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../../overview-report.service';

@Component({
  selector: 'app-front-page',
  templateUrl: './front-page.component.html',
  styleUrls: ['./front-page.component.css']
})
export class FrontPageComponent implements OnInit {

  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  reportDate: Date = new Date();
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(val => {
      this.reportOptions = val;
    });
  }

  ngOnDestroy(){
    this.reportOptionsSub.unsubscribe();
  }

}
