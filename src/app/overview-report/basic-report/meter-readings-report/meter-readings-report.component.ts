import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-meter-readings-report',
  templateUrl: './meter-readings-report.component.html',
  styleUrls: ['./meter-readings-report.component.css']
})
export class MeterReadingsReportComponent implements OnInit {
  @Input()
  facility: IdbFacility;

  meterReadingsData: Array<{
    meter: IdbUtilityMeter,
    meterReadings: Array<IdbUtilityMeterData>,
  }>;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.meterReadingsData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    facilityMeters.forEach(meter => {
      this.meterReadingsData.push({
        meter: meter,
        meterReadings: this.utilityMeterDataDbService.getMeterDataForFacility(meter, false, true)
      });
    });
  }

}
