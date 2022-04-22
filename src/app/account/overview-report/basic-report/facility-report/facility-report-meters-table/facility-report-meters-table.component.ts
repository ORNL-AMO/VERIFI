import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
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

  facilityMeterSummaryData: FacilityMeterSummaryData;
  targetYearStartDate: Date;
  targetYearEndDate: Date;
  facilityEnergyUnit: string;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private meterSummaryService: MeterSummaryService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.setMeterSummary();
  }

  setMeterSummary() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
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

    if (accountMeterData && accountMeterData.length != 0 && facilityMeters.length != 0) {
      this.facilityMeterSummaryData = this.meterSummaryService.getFacilityMetersSummary(false, facilityMeters, this.reportOptions);
      if (this.facilityMeterSummaryData.allMetersLastBill) {
        this.targetYearStartDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue);
        this.targetYearEndDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year - 1, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue + 1);
      }
    }
  }
}
