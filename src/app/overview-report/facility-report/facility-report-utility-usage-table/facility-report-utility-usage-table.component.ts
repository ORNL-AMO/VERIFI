import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { OverviewReportService, ReportOptions } from '../../overview-report.service';
import { FacilityReportService, FacilityReportUtilitySummary } from '../facility-report.service';

@Component({
  selector: 'app-facility-report-utility-usage-table',
  templateUrl: './facility-report-utility-usage-table.component.html',
  styleUrls: ['./facility-report-utility-usage-table.component.css']
})
export class FacilityReportUtilityUsageTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;

  lastBillDate: Date;
  yearPriorLastBillDate: Date;


  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  facilityReportUtilitySummary: FacilityReportUtilitySummary;
  constructor(private facilityReportService: FacilityReportService, private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      let utilityChange: boolean = false;
      if (this.reportOptions) {
        utilityChange = this.checkUtilityChange(reportOptions);
      } else {
        utilityChange = true;
      }
      this.reportOptions = reportOptions;
      if (utilityChange) {
        this.setFacilitySummary();
      }
    });
  }

  ngOnDestroy() {
    this.reportOptionsSub.unsubscribe();
  }

  checkUtilityChange(changedOptions: ReportOptions): boolean {
    //currently not working
    if (this.reportOptions.electricity != changedOptions.electricity) {
      return true;
    }
    if (this.reportOptions.naturalGas != changedOptions.naturalGas) {
      return true;
    }
    if (this.reportOptions.otherFuels != changedOptions.otherFuels) {
      return true;
    }
    if (this.reportOptions.otherEnergy != changedOptions.otherEnergy) {
      return true;
    }
    if (this.reportOptions.water != changedOptions.water) {
      return true;
    }
    if (this.reportOptions.wasteWater != changedOptions.wasteWater) {
      return true;
    }
    if (this.reportOptions.otherUtility != changedOptions.otherUtility) {
      return true;
    }
    return false;
  }


  setFacilitySummary() {
    console.log('calculate');
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    this.facilityReportUtilitySummary = this.facilityReportService.getUtilityUsageData(facilityMeters, this.reportOptions);
  }
}
