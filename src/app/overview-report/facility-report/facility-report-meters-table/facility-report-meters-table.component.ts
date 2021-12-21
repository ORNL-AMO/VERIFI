import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';

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
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private meterSummaryService: MeterSummaryService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.setMeterSummary();
  }


  setMeterSummary() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => {return meter.facilityId == this.facility.id});
    if (accountMeterData && accountMeterData.length != 0) {
      this.facilityMeterSummaryData = this.meterSummaryService.getFacilityMetersSummary(false, facilityMeters);
      if (this.facilityMeterSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year - 1, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue + 1);
      }
    }
  }
}
