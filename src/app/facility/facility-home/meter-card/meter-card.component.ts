import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityColors } from 'src/app/shared/utilityColors';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-meter-card',
  templateUrl: './meter-card.component.html',
  styleUrls: ['./meter-card.component.css']
})
export class MeterCardComponent implements OnInit {
  @Input()
  meter: IdbUtilityMeter;

  sourceColor: string;
  lastBill: IdbUtilityMeterData
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.sourceColor = UtilityColors[this.meter.source].color;
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let meterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => { return meterData.meterId == this.meter.guid });
    this.lastBill = _.maxBy(meterData, (data: IdbUtilityMeterData) => { return new Date(data.readDate) });
  }


  navigateToMeter() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + facility.id + '/utility/energy-consumption/utility-meter/' + this.meter.id + '/data-table');

  }

}
