import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';
import { OverviewReportService, ReportUtilityOptions } from '../../overview-report.service';

@Component({
  selector: 'app-facility-report-meters-table',
  templateUrl: './facility-report-meters-table.component.html',
  styleUrls: ['./facility-report-meters-table.component.css']
})
export class FacilityReportMetersTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;

  facilityMeterSummaryData: FacilityMeterSummaryData;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  facilityEnergyUnit: string;
  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private meterSummaryService: MeterSummaryService,
    private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(reportUtilityOptions => {
      this.reportUtilityOptions = reportUtilityOptions
      this.setMeterSummary();
    });
  }

  ngOnDestroy() {
    this.reportUtilityOptionsSub.unsubscribe();
  }


  setMeterSummary() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    if (!this.reportUtilityOptions.electricity) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Electricity' });
    }
    if (!this.reportUtilityOptions.naturalGas) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Natural Gas' });
    }
    if (!this.reportUtilityOptions.otherFuels) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Other Fuels' });
    }
    if (!this.reportUtilityOptions.otherEnergy) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Other Energy' });
    }
    if (!this.reportUtilityOptions.water) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Water' });
    }
    if (!this.reportUtilityOptions.wasteWater) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Waste Water' });
    }
    if (!this.reportUtilityOptions.otherUtility) {
      facilityMeters = facilityMeters.filter(meter => { return meter.source != 'Other Utility' });
    }

    if (accountMeterData && accountMeterData.length != 0 && facilityMeters.length != 0) {
      this.facilityMeterSummaryData = this.meterSummaryService.getFacilityMetersSummary(false, facilityMeters);
      if (this.facilityMeterSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year - 1, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue + 1);
      }
    }
  }
}
