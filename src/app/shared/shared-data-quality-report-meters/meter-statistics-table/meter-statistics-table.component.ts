import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Console } from 'console';
import { get } from 'http';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
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
  @Input()
  selectedMeter: IdbUtilityMeter;
  @Output()
  outlierCount = new EventEmitter<{ energy: number; cost: number }>();
  energyStats: Statistics;
  costStats: Statistics;
  meterDataToPlot: number[];
  unit: string;

  ngOnChanges() {
    this.getDataAndUnit();
    let energyData = this.meterDataToPlot;
    const costData = this.meterData?.map(d => d.totalCost);
    this.energyStats = this.getStatistics(energyData);
    this.costStats = this.getStatistics(costData);
    this.outlierCount.emit({ energy: this.energyStats.outliers, cost: this.costStats.outliers });
  }

  getDataAndUnit() {
    if (this.selectedMeter.source === 'Electricity') {
      this.meterDataToPlot = this.meterData.map(data => { return data.totalEnergyUse });
      this.unit = this.selectedMeter.energyUnit;
    }
    if (this.selectedMeter.source !== 'Electricity' && (this.selectedMeter.scope == 5 || this.selectedMeter.scope == 6)) {
      this.meterDataToPlot = this.meterData.map(data => { return data.totalVolume }),
        this.unit = this.selectedMeter.startingUnit;
    }
    else if (this.selectedMeter.source !== 'Electricity' && this.selectedMeter.scope == 2) {
      this.meterDataToPlot = this.meterData.map(data => { return data.totalEnergyUse });
      this.unit = this.selectedMeter.energyUnit;
    }
    else if (this.selectedMeter.source != 'Electricity' && (this.selectedMeter.scope != 2 && this.selectedMeter.scope != 5 && this.selectedMeter.scope != 6)) {
      const allEnergyInvalid = this.meterData.every(data =>
        data.totalEnergyUse === 0 ||
        data.totalEnergyUse === undefined ||
        data.totalEnergyUse === null
      );
      if (allEnergyInvalid) {
        this.meterDataToPlot = this.meterData.map(data => data.totalVolume);
        this.unit = this.selectedMeter.startingUnit;
      } else {
        this.meterDataToPlot = this.meterData.map(data => data.totalEnergyUse);
        this.unit = this.selectedMeter.energyUnit;
      }
    }
  }

  getStatistics(data: number[]): Statistics {
    if (!data.length) {
      return { min: NaN, max: NaN, average: NaN, median: NaN, medianAbsDev: NaN, medianminus2_5MAD: NaN, medianplus2_5MAD: NaN, outliers: 0 };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const average = data.reduce((sum, v) => sum + v, 0) / data.length;

    const median = this.calculateMedian(data);
    const medianAbsDev = this.calculateMAD(data, median);
    const medianminus2_5MAD = median - 2.5 * medianAbsDev;
    const medianplus2_5MAD = median + 2.5 * medianAbsDev;
    const outliers = this.calculateOutliers(data, median, medianAbsDev);
    return { min, max, average, median, medianAbsDev, medianminus2_5MAD, medianplus2_5MAD, outliers };

    // const variance = data.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / data.length;
    // const sd = Math.sqrt(variance);
    // const meanMinus3Sd = average - 3 * sd;
    // const meanPlus3Sd = average + 3 * sd;
    // const outliers = data.filter(v => v < meanMinus3Sd || v > meanPlus3Sd).length;
    // return { min, max, average, sd, meanMinus3Sd, meanPlus3Sd, outliers };
  }

  calculateMedian(data: number[]): number {
    const sortedData = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sortedData.length / 2);
    if (sortedData.length % 2 === 0) {
      return (sortedData[mid - 1] + sortedData[mid]) / 2;
    } else {
      return sortedData[mid];
    }
  }

  calculateMAD(data: number[], median: number): number {
    const absDeviations = data.map(value => Math.abs(value - median));
    return this.calculateMedian(absDeviations);
  }

  calculateOutliers(data: number[], median: number, mad: number): number {
    if (!data || data.length === 0) {
      return 0;
    }

    if (mad === 0) {
      return 0;
    }

    const lowerBound = median - 2.5 * mad;
    const upperBound = median + 2.5 * mad;

    return data.filter(value => value < lowerBound || value > upperBound).length;
  }

  isValueNaN(value: number): any {
    return isNaN(value);
  }
}

interface Statistics {
  min: number;
  max: number;
  average: number;
  median: number;
  medianAbsDev: number;
  medianminus2_5MAD: number;
  medianplus2_5MAD: number;
  outliers: number;
}
