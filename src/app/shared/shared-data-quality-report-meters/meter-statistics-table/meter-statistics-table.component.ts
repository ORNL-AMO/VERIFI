import { Component, Input } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getUnitFromMeter, Statistics } from '../meterDataQualityStatistics';

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
    this.unit = getUnitFromMeter(this.selectedMeter, this.meterData);
  }

  isValueNaN(value: any): boolean {
    return isNaN(value);
  }
}