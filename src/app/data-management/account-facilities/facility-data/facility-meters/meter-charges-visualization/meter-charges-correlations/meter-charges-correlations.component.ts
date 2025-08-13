import { Component, Input } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, MeterCharge } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-charges-correlations',
  standalone: false,
  templateUrl: './meter-charges-correlations.component.html',
  styleUrl: './meter-charges-correlations.component.css'
})
export class MeterChargesCorrelationsComponent {
  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input({ required: true }) charge: MeterCharge;

  hasTotalCost: boolean;
  hasDemand: boolean;
  hasData: boolean;

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit() {
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.meter.guid);
    this.hasData = utilityMeterData.length > 2;
    if (this.hasData) {
      this.hasTotalCost = utilityMeterData.find(data => {
        return isNaN(data.totalCost) == false
      }) != undefined;
      this.hasDemand = utilityMeterData.find(data => {
        return isNaN(data.totalRealDemand) == false || isNaN(data.totalBilledDemand) == false
      }) != undefined;
    }
  }

}
