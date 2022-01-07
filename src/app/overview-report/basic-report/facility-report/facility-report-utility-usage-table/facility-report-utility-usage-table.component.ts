import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ReportUtilityOptions, ReportUtilitySummary } from 'src/app/models/overview-report';
import { OverviewReportService } from '../../../overview-report.service';

@Component({
  selector: 'app-facility-report-utility-usage-table',
  templateUrl: './facility-report-utility-usage-table.component.html',
  styleUrls: ['./facility-report-utility-usage-table.component.css']
})
export class FacilityReportUtilityUsageTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  reportUtilityOptions: ReportUtilityOptions;

  facilityReportUtilitySummary: ReportUtilitySummary;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.setFacilitySummary();
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    this.facilityReportUtilitySummary = this.overviewReportService.getUtilityUsageData(facilityMeters, this.reportUtilityOptions, false);
  }
}
