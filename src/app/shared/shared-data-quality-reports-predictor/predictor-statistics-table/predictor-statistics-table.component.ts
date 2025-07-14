import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-predictor-statistics-table',
  standalone: false,

  templateUrl: './predictor-statistics-table.component.html',
  styleUrl: './predictor-statistics-table.component.css'
})
export class PredictorStatisticsTableComponent {
  @Input()
  predictorData: Array<IdbPredictorData>;
  @Input()
  selectedPredictor: IdbPredictor;
  @Output()
  outlierCount = new EventEmitter<number>();
  stats: Statistics;

  ngOnChanges() {
    const data = this.predictorData?.map(d => d.amount);
    this.stats = this.getStatistics(data);
    this.outlierCount.emit(this.stats.outliers);
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
