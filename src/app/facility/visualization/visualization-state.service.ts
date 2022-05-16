import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MeterGroupType } from 'src/app/models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { MeterGroupingService } from '../utility-data/meter-grouping/meter-grouping.service';

@Injectable({
  providedIn: 'root'
})
export class VisualizationStateService {

  selectedChart: BehaviorSubject<"splom" | "heatmap" | "timeseries">;
  meterOptions: BehaviorSubject<Array<{ meter: IdbUtilityMeter, selected: boolean }>>;
  predictorOptions: BehaviorSubject<Array<{ predictor: PredictorData, selected: boolean }>>;
  meterGroupOptions: BehaviorSubject<Array<{ meterGroup: IdbUtilityMeterGroup, selected: boolean }>>
  regressionTableData: BehaviorSubject<Array<RegressionTableDataItem>>;
  plotData: BehaviorSubject<Array<PlotDataItem>>;
  dateRange: BehaviorSubject<{ minDate: Date, maxDate: Date }>;
  meterDataOption: BehaviorSubject<'meters' | 'groups'>;


  calanderizedMeters: Array<CalanderizedMeter>;

  constructor(private visualizationService: VisualizationService, private predictorDbService: PredictordbService,
    private meterGroupingService: MeterGroupingService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService) {
    this.selectedChart = new BehaviorSubject<"splom" | "heatmap" | "timeseries">("splom");
    this.meterOptions = new BehaviorSubject<Array<{ meter: IdbUtilityMeter, selected: boolean }>>([]);
    this.predictorOptions = new BehaviorSubject<Array<{ predictor: PredictorData, selected: boolean }>>([]);
    this.regressionTableData = new BehaviorSubject<Array<RegressionTableDataItem>>([]);
    this.plotData = new BehaviorSubject<Array<PlotDataItem>>([]);
    this.dateRange = new BehaviorSubject<{ minDate: Date, maxDate: Date }>({ minDate: undefined, maxDate: undefined });
    this.meterDataOption = new BehaviorSubject<'meters' | 'groups'>('meters');
    this.meterGroupOptions = new BehaviorSubject<Array<{ meterGroup: IdbUtilityMeterGroup, selected: boolean }>>([]);
  }


  setCalanderizedMeters(){
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false, true);
  }

  setPredictorOptions(predictors: Array<PredictorData>) {
    if (predictors.length == 0) {
      this.predictorOptions.next([]);
    } else {
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
  }

  setMeterOptions() {
    let existingMeterOotions: Array<{ meter: IdbUtilityMeter, selected: boolean }> = this.meterOptions.getValue();
    let existingMeterIds: Array<number> = existingMeterOotions.map(option => { return option.meter.id });
    let checkMissing: CalanderizedMeter = this.calanderizedMeters.find(cMeter => { return !existingMeterIds.includes(cMeter.meter.id) });
    if (checkMissing) {
      let meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }> = new Array();
      this.calanderizedMeters.forEach(cMeter => {
        meterOptions.push({
          meter: cMeter.meter,
          selected: true
        });
      });
      this.meterOptions.next(meterOptions);
    }
  }

  setMeterGroupOptions() {
    let existingGroupOptions: Array<{ meterGroup: IdbUtilityMeterGroup, selected: boolean }> = this.meterGroupOptions.getValue();
    let existingMeterIds: Array<string> = existingGroupOptions.map(option => { return option.meterGroup.guid });
    let checkMissing: CalanderizedMeter = this.calanderizedMeters.find(cMeter => { return !existingMeterIds.includes(cMeter.meter.groupId) });
    if (checkMissing) {
      let meterGroupOptions: Array<{ meterGroup: IdbUtilityMeterGroup, selected: boolean }> = new Array();
      let meterGroupTypes: Array<MeterGroupType> = this.meterGroupingService.getMeterGroupTypes(this.calanderizedMeters);
      let allMeterGroups: Array<IdbUtilityMeterGroup> = meterGroupTypes.flatMap(groupType => { return groupType.meterGroups });
      allMeterGroups.forEach(group => {
        meterGroupOptions.push({
          meterGroup: group,
          selected: true
        })
      });
      this.meterGroupOptions.next(meterGroupOptions);
    }
  }

  setData() {
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let predictorOptions: Array<{ predictor: PredictorData, selected: boolean }> = this.predictorOptions.getValue();
    let meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }> = this.meterOptions.getValue();
    let dateRange: { minDate: Date, maxDate: Date } = this.dateRange.getValue();
    let meterGroupOptions: Array<{ meterGroup: IdbUtilityMeterGroup, selected: boolean }> = this.meterGroupOptions.getValue();
    let meterDataOption: "groups" | "meters" = this.meterDataOption.getValue();
    let plotData: Array<PlotDataItem> = this.visualizationService.getPlotData(predictorOptions, meterOptions, facilityPredictorEntries, dateRange, meterGroupOptions, meterDataOption, this.calanderizedMeters);
    let regressionTableData: Array<RegressionTableDataItem> = this.visualizationService.getRegressionTableData(plotData);
    this.plotData.next(plotData);
    this.regressionTableData.next(regressionTableData);
  }
}
