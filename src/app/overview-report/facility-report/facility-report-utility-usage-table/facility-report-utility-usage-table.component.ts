import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { OverviewReportService, ReportOptions, ReportUtilityOptions } from '../../overview-report.service';
import { FacilityReportService, FacilityReportUtilitySummary } from '../facility-report.service';

@Component({
  selector: 'app-facility-report-utility-usage-table',
  templateUrl: './facility-report-utility-usage-table.component.html',
  styleUrls: ['./facility-report-utility-usage-table.component.css']
})
export class FacilityReportUtilityUsageTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  facilityReportUtilitySummary: FacilityReportUtilitySummary;
  constructor(private facilityReportService: FacilityReportService, private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(reportUtilityOptions => {
      this.reportUtilityOptions = reportUtilityOptions
      this.setFacilitySummary();
    });
  }

  ngOnDestroy() {
    this.reportUtilityOptionsSub.unsubscribe();
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    this.facilityReportUtilitySummary = this.facilityReportService.getUtilityUsageData(facilityMeters, this.reportUtilityOptions);
  }
}
