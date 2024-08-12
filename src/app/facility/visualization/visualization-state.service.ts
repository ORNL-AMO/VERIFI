import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Injectable({
  providedIn: 'root'
})
export class VisualizationStateService {


  dateRange: BehaviorSubject<{ minDate: Date, maxDate: Date }>;
  calanderizedMeters: Array<CalanderizedMeter>;
  menuOpen: BehaviorSubject<boolean>;

  correlationPlotOptions: BehaviorSubject<CorrelationPlotOptions>;

  constructor(private predictorDbService: PredictorDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDataDbService: PredictorDataDbService) {
    this.dateRange = new BehaviorSubject<{ minDate: Date, maxDate: Date }>(undefined);

    this.menuOpen = new BehaviorSubject<boolean>(true);
    this.correlationPlotOptions = new BehaviorSubject<CorrelationPlotOptions>(undefined);
  }

  setCalanderizedMeters(facility: IdbFacility) {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.calanderizedMeters = getCalanderizedMeterData(facilityMeters, meterData, facility, true, undefined, [], [], [facility]);

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
    let predictors: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
    predictors.forEach((predictor, index) => {
      xAxisPredictorOptions.push({
        itemId: predictor.guid,
        label: predictor.name,
        type: 'predictor',
        selected: true
      });
      yAxisPredictorOptions.push({
        itemId: predictor.guid,
        label: predictor.name,
        type: 'predictor',
        selected: false
      });
      r2PredictorOptions.push({
        itemId: predictor.guid,
        label: predictor.name,
        type: 'predictor',
        selected: true
      });
      timeSeriesPredictorYAxis1Options.push({
        itemId: predictor.guid,
        label: predictor.name,
        type: 'predictor',
        selected: false
      });
      timeSeriesPredictorYAxis2Options.push({
        itemId: predictor.guid,
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
      timeSeriesPredictorYAxis2Options: timeSeriesPredictorYAxis2Options,
      totalEnergyTimeSeriesYAxis1: false,
      totalEnergyTimeSeriesYAxis2: false,
      totalSelectedEnergyTimeSeriesYAxis1: false,
      totalSelectedEnergyTimeSeriesYAxis2: false,
    });
  }


  getValues(axisOption: AxisOption, dates: Array<Date>): Array<number> {
    let values: Array<number> = new Array();
    if (axisOption.type == 'meter') {
      let calanderizedMeter: CalanderizedMeter = this.calanderizedMeters.find(cMeter => { return cMeter.meter.guid == axisOption.itemId });
      dates.forEach(date => {
        let monthlyData: MonthlyData = calanderizedMeter.monthlyData.find(mData => {
          return mData.date.getMonth() == date.getMonth() && mData.date.getFullYear() == date.getFullYear();
        });
        if (monthlyData) {
          if (getIsEnergyMeter(calanderizedMeter.meter.source)) {
            values.push(monthlyData.energyUse);
          } else {
            values.push(monthlyData.energyConsumption);
          }
        } else {
          values.push(0);
        }
      })
    } else if (axisOption.type == 'meterGroup') {
      let facilityGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
      let group: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.guid == axisOption.itemId });
      let groupMeters: Array<CalanderizedMeter> = this.calanderizedMeters.filter(cMeter => {
        return cMeter.meter.groupId == axisOption.itemId;
      })
      let groupMonthlyData: Array<MonthlyData> = groupMeters.flatMap(cMeter => {
        return cMeter.monthlyData;
      });
      dates.forEach(date => {
        let monthlyData: Array<MonthlyData> = groupMonthlyData.filter(mData => {
          return mData.date.getMonth() == date.getMonth() && mData.date.getFullYear() == date.getFullYear();
        })
        if (monthlyData) {
          if (group.groupType == 'Energy') {
            let value: number = _.sumBy(monthlyData, 'energyUse')
            values.push(value);
          } else {
            let value: number = _.sumBy(monthlyData, 'energyConsumption')
            values.push(value);
          }
        } else {
          values.push(0);
        }

      });
    } else if (axisOption.type == 'predictor') {
      let facilityPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();
      dates.forEach(date => {
        let monthPredictorEntry: IdbPredictorData = facilityPredictorEntries.find(entry => {
          return entry.predictorId == axisOption.itemId && entry.date.getMonth() == date.getMonth() && entry.date.getFullYear() == date.getFullYear();
        });
        if (monthPredictorEntry) {
          values.push(monthPredictorEntry.amount);
        } else {
          values.push(0);
        }
      });
    }
    return values;
  }

  getTotalEnergyUse(dates: Array<Date>, axisOptions?: Array<AxisOption>, asMeters?: boolean): Array<number> {
    let values: Array<number> = [];
    // let groupMonthlyData: Array<MonthlyData> = groupMeters.flatMap(cMeter => {
    //   return cMeter.monthlyData;
    // });
    let allMonthlyData: Array<MonthlyData>;
    if (!axisOptions) {
      allMonthlyData = this.calanderizedMeters.flatMap(cMeter => {
        return cMeter.monthlyData;
      })
    } else {
      let selectedOptionsIds: Array<string> = [];
      axisOptions.forEach(option => {
        if (option.selected) {
          selectedOptionsIds.push(option.itemId);
        }
      });
      let includedMeters: Array<CalanderizedMeter>;
      if (asMeters) {
        includedMeters = this.calanderizedMeters.filter(cMeter => {
          return selectedOptionsIds.includes(cMeter.meter.guid);
        });
      } else {
        includedMeters = this.calanderizedMeters.filter(cMeter => {
          return selectedOptionsIds.includes(cMeter.meter.groupId);
        });
      }
      allMonthlyData = includedMeters.flatMap(cMeter => {
        return cMeter.monthlyData
      });
    }

    dates.forEach(date => {
      let monthlyData: Array<MonthlyData> = allMonthlyData.filter(mData => {
        return mData.date.getMonth() == date.getMonth() && mData.date.getFullYear() == date.getFullYear();
      })
      if (monthlyData) {
        let value: number = _.sumBy(monthlyData, 'energyUse')
        values.push(value);
      } else {
        values.push(0);
      }
    });
    return values;
  }

  getDates(): Array<Date> {
    let dateRange: { minDate: Date, maxDate: Date } = this.dateRange.getValue();
    let dates: Array<Date> = new Array();
    if (dateRange) {
      let startDate: Date = new Date(dateRange.minDate);
      let endDate: Date = new Date(dateRange.maxDate);
      endDate.setMonth(endDate.getMonth() + 1);
      while (startDate < endDate) {
        dates.push(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
    return dates;
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
  totalEnergyTimeSeriesYAxis1: boolean,
  totalEnergyTimeSeriesYAxis2: boolean,
  totalSelectedEnergyTimeSeriesYAxis1: boolean,
  totalSelectedEnergyTimeSeriesYAxis2: boolean,
}

export interface AxisOption {
  itemId: string,
  label: string,
  type: 'meter' | 'meterGroup' | 'predictor',
  selected: boolean
}
