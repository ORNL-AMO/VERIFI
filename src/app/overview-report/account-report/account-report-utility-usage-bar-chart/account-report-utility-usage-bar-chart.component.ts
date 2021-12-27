import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-report-utility-usage-bar-chart',
  templateUrl: './account-report-utility-usage-bar-chart.component.html',
  styleUrls: ['./account-report-utility-usage-bar-chart.component.css']
})
export class AccountReportUtilityUsageBarChartComponent implements OnInit {
  @Input()
  account: IdbAccount;



  constructor() { }

  ngOnInit(): void {
  }

}
