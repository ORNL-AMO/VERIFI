import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Console } from 'console';
import { get } from 'http';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { Statistics } from '../meterDataQualityStatistics';

@Component({
  selector: 'app-meter-statistics-table',
  standalone: false,

  templateUrl: './meter-statistics-table.component.html',
  styleUrl: './meter-statistics-table.component.css'
})
export class MeterStatisticsTableComponent {
  @Input()
  meterData: Array<IdbUtilityMeterData>;
  @Input()
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  energyStats: Statistics;
  @Input({ required: true })
  costStats: Statistics;

  unit: string;

  ngOnChanges() {
    this.setUnit();
  }

  setUnit() {
    if (this.selectedMeter.source === 'Electricity') {
      this.unit = this.selectedMeter.energyUnit;
    }
    if (this.selectedMeter.source !== 'Electricity' && (this.selectedMeter.scope == 5 || this.selectedMeter.scope == 6)) {
      this.unit = this.selectedMeter.startingUnit;
    }
    else if (this.selectedMeter.source !== 'Electricity' && this.selectedMeter.scope == 2) {
      this.unit = this.selectedMeter.energyUnit;
    }
    else if (this.selectedMeter.source != 'Electricity' && (this.selectedMeter.scope != 2 && this.selectedMeter.scope != 5 && this.selectedMeter.scope != 6)) {
      const allEnergyInvalid = this.meterData.every(data =>
        data.totalEnergyUse === 0 ||
        data.totalEnergyUse === undefined ||
        data.totalEnergyUse === null
      );
      if (allEnergyInvalid) {
        this.unit = this.selectedMeter.startingUnit;
      } else {
        this.unit = this.selectedMeter.energyUnit;
      }
    }
  }

  isValueNaN(value: any): boolean {
    return isNaN(value);
  }
}