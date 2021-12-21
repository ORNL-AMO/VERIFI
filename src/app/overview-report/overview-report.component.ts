import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { OverviewReportService } from './overview-report.service';

@Component({
  selector: 'app-overview-report',
  templateUrl: './overview-report.component.html',
  styleUrls: ['./overview-report.component.css']
})
export class OverviewReportComponent implements OnInit {

  showReportMenu: boolean;
  showReportMenuSub: Subscription;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.overviewReportService.initializeOptions();
    this.showReportMenuSub = this.overviewReportService.showReportMenu.subscribe(val => { 
      this.showReportMenu = val;
    })
  }

  ngOnDestroy(){
    this.showReportMenuSub.unsubscribe();
  }

}
