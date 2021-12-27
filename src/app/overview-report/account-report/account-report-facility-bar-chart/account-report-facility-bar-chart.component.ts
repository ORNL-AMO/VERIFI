import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-report-facility-bar-chart',
  templateUrl: './account-report-facility-bar-chart.component.html',
  styleUrls: ['./account-report-facility-bar-chart.component.css']
})
export class AccountReportFacilityBarChartComponent implements OnInit {
  @Input()
  account: IdbAccount;

  constructor() { }

  ngOnInit(): void {
  }

}
