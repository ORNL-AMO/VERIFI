import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbUtilityMeter, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class VisualizationStateService {


  dateRange: BehaviorSubject<{ minDate: Date, maxDate: Date }>;
  calanderizedMeters: Array<CalanderizedMeter>;
  menuOpen: BehaviorSubject<boolean>;

  correlationPlotOptions: BehaviorSubject<CorrelationPlotOptions>;

  constructor(private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) {
    this.dateRange = new BehaviorSubject<{ minDate: Date, maxDate: Date }>(undefined);

    this.menuOpen = new BehaviorSubject<boolean>(true);
    this.correlationPlotOptions = new BehaviorSubject<CorrelationPlotOptions>(undefined);
  }

  setCalanderizedMeters() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false, true);
  }

  initilizeCorrelationPlotOptions() {
    let xAxisMeterOptions: Array<AxisOption> = new Array();
    let xAxisGroupOptions: Array<AxisOption> = new Array();
    let xAxisPredictorOptions: Array<AxisOption> = new Array();
    let yAxisMeterOptions: Array<AxisOption> = new Array();
    let yAxisGroupOptions: Array<AxisOption> = new Array();
    let yAxisPredictorOptions: Array<AxisOption> = new Array();
    let r2MeterOptions: Array<AxisOption> = new Array();
    let r2GroupOptions: Array<AxisOption> = new Array();
    let r2PredictorOptions: Array<AxisOption> = new Array();
    let timeSeriesMeterYAxis1Options: Array<AxisOption> = new Array();
    let timeSeriesMeterYAxis2Options: Array<AxisOption> = new Array();
    let timeSeriesGroupYAxis1Options: Array<AxisOption> = new Array();
    let timeSeriesGroupYAxis2Options: Array<AxisOption> = new Array();
    let timeSeriesPredictorYAxis1Options: Array<AxisOption> = new Array();
    let timeSeriesPredictorYAxis2Options: Array<AxisOption> = new Array();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    meters.forEach((meter, index) => {
      xAxisMeterOptions.push({
        itemId: meter.guid,
        label: meter.name,
        type: 'meter',
        selected: false
      });
      yAxisMeterOptions.push({
        itemId: meter.guid,
        label: meter.name,
        type: 'meter',
        selected: true
      });
      r2MeterOptions.push({
        itemId: meter.guid,
        label: meter.name,
        type: 'meter',
        selected: true
      });
      timeSeriesMeterYAxis1Options.push({
        itemId: meter.guid,
        label: meter.name,
        type: 'meter',
        selected: true
      });
      timeSeriesMeterYAxis2Options.push({
        itemId: meter.guid,
        label: meter.name,
        type: 'meter',
        selected: false
      });
    });

    let meterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    meterGroups.forEach(meterGroup => {
      xAxisGroupOptions.push({
        itemId: meterGroup.guid,
        label: meterGroup.name,
        type: 'meterGroup',
        selected: false
      });
      yAxisGroupOptions.push({
        itemId: meterGroup.guid,
        label: meterGroup.name,
        type: 'meterGroup',
        selected: true
      });
      r2GroupOptions.push({
        itemId: meterGroup.guid,
        label: meterGroup.name,
        type: 'meterGroup',
        selected: true
      });

      timeSeriesGroupYAxis1Options.push({
        itemId: meterGroup.guid,
        label: meterGroup.name,
        type: 'meterGroup',
        selected: true
      });
      timeSeriesGroupYAxis2Options.push({
        itemId: meterGroup.guid,
        label: meterGroup.name,
        type: 'meterGroup',
        selected: false
      });
    });
    let predictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    predictors.forEach((predictor, index) => {
      xAxisPredictorOptions.push({
        itemId: predictor.id,
        label: predictor.name,
        type: 'predictor',
        selected: true
      });
      yAxisPredictorOptions.push({
        itemId: predictor.id,
        label: predictor.name,
        type: 'predictor',
        selected: false
      });
      r2PredictorOptions.push({
        itemId: predictor.id,
        label: predictor.name,
        type: 'predictor',
        selected: true
      });
      timeSeriesPredictorYAxis1Options.push({
        itemId: predictor.id,
        label: predictor.name,
        type: 'predictor',
        selected: false
      });
      timeSeriesPredictorYAxis2Options.push({
        itemId: predictor.id,
        label: predictor.name,
        type: 'predictor',
        selected: true
      });
    });
    this.correlationPlotOptions.next({
      xAxisMeterOptions: xAxisMeterOptions,
      xAxisGroupOptions: xAxisGroupOptions,
      xAxisPredictorOptions: xAxisPredictorOptions,
      yAxisMeterOptions: yAxisMeterOptions,
      yAxisGroupOptions: yAxisGroupOptions,
      yAxisPredictorOptions: yAxisPredictorOptions,
      asMeters: false,
      r2MeterOptions: r2MeterOptions,
      r2GroupOptions: r2GroupOptions,
      r2PredictorOptions: r2PredictorOptions,
      timeSeriesMeterYAxis1Options: timeSeriesMeterYAxis1Options,
      timeSeriesMeterYAxis2Options: timeSeriesMeterYAxis2Options,
      timeSeriesGroupYAxis1Options: timeSeriesGroupYAxis1Options,
      timeSeriesGroupYAxis2Options: timeSeriesGroupYAxis2Options,
      timeSeriesPredictorYAxis1Options: timeSeriesPredictorYAxis1Options,
      timeSeriesPredictorYAxis2Options: timeSeriesPredictorYAxis2Options
    });
  }
}


export interface CorrelationPlotOptions {
  xAxisMeterOptions: Array<AxisOption>;
  xAxisGroupOptions: Array<AxisOption>;
  xAxisPredictorOptions: Array<AxisOption>;
  yAxisMeterOptions: Array<AxisOption>;
  yAxisGroupOptions: Array<AxisOption>;
  yAxisPredictorOptions: Array<AxisOption>;
  asMeters: boolean;
  r2MeterOptions: Array<AxisOption>,
  r2GroupOptions: Array<AxisOption>,
  r2PredictorOptions: Array<AxisOption>,
  timeSeriesMeterYAxis1Options: Array<AxisOption>,
  timeSeriesMeterYAxis2Options: Array<AxisOption>,
  timeSeriesGroupYAxis1Options: Array<AxisOption>,
  timeSeriesGroupYAxis2Options: Array<AxisOption>,
  timeSeriesPredictorYAxis1Options: Array<AxisOption>
  timeSeriesPredictorYAxis2Options: Array<AxisOption>
}

export interface AxisOption {
  itemId: string,
  label: string,
  type: 'meter' | 'meterGroup' | 'predictor',
  selected: boolean
}
