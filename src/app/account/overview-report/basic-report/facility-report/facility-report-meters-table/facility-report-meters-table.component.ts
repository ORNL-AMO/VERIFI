import { Component, Input, OnInit } from '@angular/core';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';

@Component({
  selector: 'app-facility-report-meters-table',
  templateUrl: './facility-report-meters-table.component.html',
  styleUrls: ['./facility-report-meters-table.component.css']
})
export class FacilityReportMetersTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  reportOptions: ReportOptions;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;

  facilityMeterSummaryData: FacilityMeterSummaryData;
  targetYearStartDate: Date;
  targetYearEndDate: Date;
  facilityEnergyUnit: string;
  constructor(private meterSummaryService: MeterSummaryService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.setMeterSummary();
  }

  setMeterSummary() {
    if (this.calanderizedMeters && this.calanderizedMeters.length != 0) {
      let lastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(this.calanderizedMeters)
      this.facilityMeterSummaryData = this.meterSummaryService.getDashboardFacilityMeterSummary(this.calanderizedMeters, lastBill);
      if (this.facilityMeterSummaryData.allMetersLastBill) {
        this.targetYearStartDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue);
        this.targetYearEndDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year - 1, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue + 1);
      }
    }
  }
}
