import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';

@Injectable({
  providedIn: 'root'
})
export class VisualizationStateService {

  selectedChart: BehaviorSubject<"splom" | "heatmap" | "timeseries">;
  meterOptions: BehaviorSubject<Array<{ meter: IdbUtilityMeter, selected: boolean }>>;
  predictorOptions: BehaviorSubject<Array<{ predictor: PredictorData, selected: boolean }>>;
  regressionTableData: BehaviorSubject<Array<RegressionTableDataItem>>;
  plotData: BehaviorSubject<Array<PlotDataItem>>;
  dateRange: BehaviorSubject<{ minDate: Date, maxDate: Date }>;
  meterDataOption: BehaviorSubject<string>;
  constructor(private visualizationService: VisualizationService, private predictorDbService: PredictordbService) {
    this.selectedChart = new BehaviorSubject<"splom" | "heatmap" | "timeseries">("splom");
    this.meterOptions = new BehaviorSubject<Array<{ meter: IdbUtilityMeter, selected: boolean }>>([]);
    this.predictorOptions = new BehaviorSubject<Array<{ predictor: PredictorData, selected: boolean }>>([]);
    this.regressionTableData = new BehaviorSubject<Array<RegressionTableDataItem>>([]);
    this.plotData = new BehaviorSubject<Array<PlotDataItem>>([]);
    this.dateRange = new BehaviorSubject<{ minDate: Date, maxDate: Date }>({ minDate: undefined, maxDate: undefined });
    this.meterDataOption = new BehaviorSubject<string>('meters');
  }

  setPredictorOptions(predictors: Array<PredictorData>) {
    let existingPredictorOptions: Array<{ predictor: PredictorData, selected: boolean }> = this.predictorOptions.getValue();
    let existingPredictorIds: Array<string> = existingPredictorOptions.map(option => { return option.predictor.id });
    let checkMissing: PredictorData = predictors.find(predictor => { return !existingPredictorIds.includes(predictor.id) });
    if (checkMissing) {
      let predictorOptions: Array<{ predictor: PredictorData, selected: boolean }> = new Array();
      predictors.forEach(predictor => {
        predictorOptions.push({
          predictor: predictor,
          selected: true
        });
      });
      this.predictorOptions.next(predictorOptions);
    }
  }

  setMeterOptions(facilityMeters: Array<IdbUtilityMeter>) {
    let existingMeterOotions: Array<{ meter: IdbUtilityMeter, selected: boolean }> = this.meterOptions.getValue();
    let existingMeterIds: Array<number> = existingMeterOotions.map(option => { return option.meter.id });
    let checkMissing: IdbUtilityMeter = facilityMeters.find(meter => { return !existingMeterIds.includes(meter.id) });
    if (checkMissing) {
      let meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }> = new Array();
      facilityMeters.forEach(meter => {
        meterOptions.push({
          meter: meter,
          selected: true
        });
      });
      this.meterOptions.next(meterOptions);
    }
  }

  setData() {
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let predictorOptions: Array<{ predictor: PredictorData, selected: boolean }> = this.predictorOptions.getValue();
    let meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }> = this.meterOptions.getValue();
    let dateRange: { minDate: Date, maxDate: Date } = this.dateRange.getValue();
    let plotData: Array<PlotDataItem> = this.visualizationService.getPlotData(predictorOptions, meterOptions, facilityPredictorEntries, dateRange);
    let regressionTableData: Array<RegressionTableDataItem> = this.visualizationService.getRegressionTableData(plotData);
    this.plotData.next(plotData);
    this.regressionTableData.next(regressionTableData);
  }
}
