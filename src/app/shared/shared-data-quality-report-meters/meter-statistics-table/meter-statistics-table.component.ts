import { Component, Input } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-statistics-table',
  standalone: false,

  templateUrl: './meter-statistics-table.component.html',
  styleUrl: './meter-statistics-table.component.css'
})
export class MeterStatisticsTableComponent {

  @Input()
  meterData: Array<IdbUtilityMeterData>;
  energyStats: Statistics;
  costStats: Statistics;
 
  ngOnChanges() {
    const energyData = this.meterData?.map(d => d.totalEnergyUse);
    const costData = this.meterData?.map(d => d.totalCost);
    this.energyStats = this.getStatistics(energyData);
    this.costStats = this.getStatistics(costData);
  }

  getStatistics(data: number[]): Statistics {
    if (!data.length) {
      return { min: NaN, max: NaN, average: NaN, sd: NaN, meanMinus3Sd: NaN, meanPlus3Sd: NaN, outliers: 0 };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const average = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / data.length;
    const sd = Math.sqrt(variance);
    const meanMinus3Sd = average - 3 * sd;
    const meanPlus3Sd = average + 3 * sd;
    const outliers = data.filter(v => v < meanMinus3Sd || v > meanPlus3Sd).length;
    return { min, max, average, sd, meanMinus3Sd, meanPlus3Sd, outliers };
  }

  isValueNaN(value: number): any {
    return isNaN(value);
  }
}

interface Statistics {
  min: number;
  max: number;
  average: number;
  sd: number;
  meanMinus3Sd: number;
  meanPlus3Sd: number;
  outliers: number;
}
