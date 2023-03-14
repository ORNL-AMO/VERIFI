import { Component, ElementRef, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';
import * as _ from 'lodash';
import * as jStat from 'jstat';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { AxisOption, CorrelationPlotOptions, VisualizationStateService } from '../visualization-state.service';

@Component({
  selector: 'app-correlation-heatmap',
  templateUrl: './correlation-heatmap.component.html',
  styleUrls: ['./correlation-heatmap.component.css']
})
export class CorrelationHeatmapComponent{
  @ViewChild('heatMapPlot', { static: false }) heatMapPlot: ElementRef;


  dates: Array<Date>;
  correlationPlotOptions: CorrelationPlotOptions;
  constructor(private visualizationStateService: VisualizationStateService, private plotlyService: PlotlyService,
    private predictorDbService: PredictordbService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.correlationPlotOptions = this.visualizationStateService.correlationPlotOptions.getValue();
    this.setDates();
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
    this.drawHeatMap();
  }

  drawHeatMap() {
    if (this.dates && this.heatMapPlot) {
      let axisData: Array<{
        option: AxisOption,
        values: Array<number>
      }> = this.getData();
      //heat map 
      if (axisData.length > 1) {
        var yLabels: Array<string> = axisData.map(data => { return data.option.label });
        yLabels.pop();
        var xLabels: Array<string> = axisData.map(data => { return data.option.label });
        xLabels = xLabels.reverse();
        xLabels.pop();
        var zValues: Array<Array<number>> = new Array<Array<number>>();

        for (let y = 0; y < yLabels.length; y++) {
          let valuesArr: Array<number> = new Array();
          let yItem: {
            option: AxisOption,
            values: Array<number>
          } = axisData.find(dataItem => { return dataItem.option.label == yLabels[y] });
          for (let x = 0; x < (xLabels.length - y); x++) {
            let xItem: {
              option: AxisOption,
              values: Array<number>
            } = axisData.find(dataItem => { return dataItem.option.label == xLabels[x] });
            let r2 = this.getR2(yItem.values, xItem.values);
            if (r2) {
              valuesArr.push(this.getSigFigs(r2));
            }
          }
          zValues.push(valuesArr);
        }

        var data = [{
          colorscale: [
            ['0.0', 'rgb(165,0,38)'],
            ['0.111111111111', 'rgb(215,48,39)'],
            ['0.222222222222', 'rgb(244,109,67)'],
            ['0.333333333333', 'rgb(253,174,97)'],
            ['0.444444444444', 'rgb(254,224,144)'],
            ['0.555555555556', 'rgb(224,243,248)'],
            ['0.666666666667', 'rgb(171,217,233)'],
            ['0.777777777778', 'rgb(116,173,209)'],
            ['0.888888888889', 'rgb(69,117,180)'],
            ['1.0', 'rgb(49,54,149)']
          ],
          x: xLabels,
          y: yLabels,
          z: zValues,
          type: 'heatmap',
          // hovertemplate: '%{x} vs %{y} : %{z} <extra></extra>'
        }];

        var layout = {
          height: 700,
          title: 'R&#178; Variance',
          annotations: [],
          yaxis: {
            automargin: true,
          },
          xaxis: {
            automargin: true
          }
        };

        for (let i = 0; i < xLabels.length; i++) {
          for (let j = 0; j < yLabels.length; j++) {
            let result = {
              xref: 'x1',
              yref: 'y1',
              x: xLabels[i],
              y: yLabels[j],
              text: zValues[j][i],
              font: {
                size: 12,
                color: 'white',
              },
              showarrow: false,
            };
            layout.annotations.push(result);
          }
        }
        let config = {
          displaylogo: false,
          responsive: true
        };
        this.plotlyService.newPlot(this.heatMapPlot.nativeElement, data, layout, config);
      }
    }
  }


  getSigFigs(val: number): number {
    return Number((val).toLocaleString(undefined, { maximumSignificantDigits: 3 }));
    // return Number((Math.round(val * 100) / 100).toFixed(4))
  }


  getData(): Array<{
    option: AxisOption,
    values: Array<number>
  }> {
    let allAxisOptions: Array<{
      option: AxisOption,
      values: Array<number>
    }> = new Array();


    this.correlationPlotOptions.r2PredictorOptions.forEach(option => {
      if (option.selected) {
        allAxisOptions.push({
          option: option,
          values: this.getValues(option)
        });
      }
    });
    if (this.correlationPlotOptions.asMeters) {
      this.correlationPlotOptions.r2MeterOptions.forEach(meterOption => {
        if (meterOption.selected) {
          allAxisOptions.push({
            option: meterOption,
            values: this.getValues(meterOption)
          });
        }
      })
    } else {
      this.correlationPlotOptions.r2GroupOptions.forEach(groupOption => {
        if (groupOption.selected) {
          allAxisOptions.push({
            option: groupOption,
            values: this.getValues(groupOption)
          });
        }
      });
    };
    return allAxisOptions;
  }

  setDates() {
    let dateRange: { minDate: Date, maxDate: Date } = this.visualizationStateService.dateRange.getValue();
    this.dates = new Array();
    let startDate: Date = new Date(dateRange.minDate);
    let endDate: Date = new Date(dateRange.maxDate);
    while (startDate < endDate) {
      this.dates.push(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
      startDate.setMonth(startDate.getMonth() + 1);
    }
  }

  getValues(axisOption: AxisOption): Array<number> {
    let values: Array<number> = new Array();
    let calanderizedMeters: Array<CalanderizedMeter> = this.visualizationStateService.calanderizedMeters;
    if (axisOption.type == 'meter') {
      let calanderizedMeter: CalanderizedMeter = calanderizedMeters.find(cMeter => { return cMeter.meter.guid == axisOption.itemId });
      this.dates.forEach(date => {
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
      let groupMeters: Array<CalanderizedMeter> = this.visualizationStateService.calanderizedMeters.filter(cMeter => {
        return cMeter.meter.groupId == axisOption.itemId;
      })
      let groupMonthlyData: Array<MonthlyData> = groupMeters.flatMap(cMeter => {
        return cMeter.monthlyData;
      });
      this.dates.forEach(date => {
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
      let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
      this.dates.forEach(date => {
        let monthPredictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
          return entry.date.getMonth() == date.getMonth() && entry.date.getFullYear() == date.getFullYear();
        });
        if (monthPredictorEntry) {
          let predictor: PredictorData = monthPredictorEntry.predictors.find(predictor => {
            return predictor.id == axisOption.itemId;
          });
          if (predictor) {
            values.push(predictor.amount);
          } else {
            values.push(0);
          }
        } else {
          values.push(0);
        }
      });
    }
    return values;
  }

  getR2(xValues: Array<number>, yValue: Array<number>) {
    let endog: Array<number> = xValues;
    let exog: Array<Array<number>> = yValue.map(val => { return [1, val] });
    try {
      let model: JStatRegressionModel = jStat.models.ols(endog, exog);
      return model.R2;
    } catch (err) {

    }
  }
}
