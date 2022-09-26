import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';

@Component({
  selector: 'app-meter-readings-report',
  templateUrl: './meter-readings-report.component.html',
  styleUrls: ['./meter-readings-report.component.css']
})
export class MeterReadingsReportComponent implements OnInit {
  @Input()
  facility: {facilityId: string, selected: boolean};

  meterReadingsData: Array<{
    meter: IdbUtilityMeter,
    meterReadings: Array<IdbUtilityMeterData>,
    showVolumeColumn: boolean,
    showEnergyColumn: boolean
  }>;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.meterReadingsData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.facilityId });
    facilityMeters.forEach(meter => {
      let meterReadings: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter, false, true);
      let showVolumeColumn: boolean = meterReadings.find(reading => {return reading.totalVolume != 0 && reading.totalVolume != undefined}) != undefined;
      let showEnergyColumn = this.energyUnitsHelperService.isEnergyMeter(meter.source);
      this.meterReadingsData.push({
        meter: meter,
        meterReadings: meterReadings,
        showVolumeColumn: showVolumeColumn,
        showEnergyColumn: showEnergyColumn
      });
    });
  }

}
