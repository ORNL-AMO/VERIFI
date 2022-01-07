import { Component, Input, OnInit } from '@angular/core';
import { IdbFacility } from 'src/app/models/idb';
import { ReportOptions, ReportUtilityOptions } from 'src/app/models/overview-report';

@Component({
  selector: 'app-facility-report',
  templateUrl: './facility-report.component.html',
  styleUrls: ['./facility-report.component.css']
})
export class FacilityReportComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  reportOptions: ReportOptions;
  @Input()
  reportUtilityOptions: ReportUtilityOptions;

  constructor() { }

  ngOnInit(): void {

  }
}
