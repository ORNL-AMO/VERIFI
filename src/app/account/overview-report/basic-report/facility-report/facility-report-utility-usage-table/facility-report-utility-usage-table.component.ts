import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ReportOptions, ReportUtilitySummary } from 'src/app/models/overview-report';
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
  reportOptions: ReportOptions;

  facilityReportUtilitySummary: ReportUtilitySummary;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.setFacilitySummary();
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    if (!this.reportOptions.electricity) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Electricity' });
    }
    if (!this.reportOptions.naturalGas) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Natural Gas' });
    }
    if (!this.reportOptions.otherFuels) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Other Fuels' });
    }
    if (!this.reportOptions.otherEnergy) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Other Energy' });
    }
    if (!this.reportOptions.water) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Water' });
    }
    if (!this.reportOptions.wasteWater) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Waste Water' });
    }
    if (!this.reportOptions.otherUtility) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Other Utility' });
    }
    // this.facilityReportUtilitySummary = this.overviewReportService.getUtilityUsageData(facilityMeters, this.reportOptions, false);
  }
}
