import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';
import * as _ from 'lodash';
import { AxisOption, CorrelationPlotOptions, VisualizationStateService } from '../visualization-state.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';

@Component({
  selector: 'app-time-series',
  templateUrl: './time-series.component.html',
  styleUrls: ['./time-series.component.css']
})
export class TimeSeriesComponent implements OnInit {

  @ViewChild('timeSeries', { static: false }) timeSeries: ElementRef;

  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  dates: Array<Date>;
  correlationPlotOptions: CorrelationPlotOptions;
  constructor(private plotlyService: PlotlyService, private visualizationStateService: VisualizationStateService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.correlationPlotOptions = this.visualizationStateService.correlationPlotOptions.getValue();
    this.setDates();
  }


  ngAfterViewInit() {
    this.drawTimeSeries();
  }


  drawTimeSeries() {
    if (this.timeSeries) {
      let traceData = new Array();
      let hasEnergyData: boolean = false;
      if (this.correlationPlotOptions.asMeters) {
        this.correlationPlotOptions.timeSeriesMeterOptions.forEach(axisOption => {
          if (axisOption.selected) {
            hasEnergyData = true;
            let values: Array<number> = this.getValues(axisOption);
            traceData.push({
              x: this.dates,
              y: values,
              name: axisOption.label,
              type: 'scatter',
              yaxis: 'y',
              line: { width: 5 }
            });
          }
        })
      } else {
        this.correlationPlotOptions.timeSeriesGroupOptions.forEach(axisOption => {
          if (axisOption.selected) {
            hasEnergyData = true;
            let values: Array<number> = this.getValues(axisOption);
            traceData.push({
              x: this.dates,
              y: values,
              name: axisOption.label,
              type: 'scatter',
              yaxis: 'y',
              line: { width: 5 }
            });
          }
        });
      }
      let yaxis: string = 'y';
      if(hasEnergyData){
        yaxis = 'y2'
      }

      this.correlationPlotOptions.timeSeriesPredictorOptions.forEach(axisOption => {
        if (axisOption.selected) {
          let values: Array<number> = this.getValues(axisOption);
          traceData.push({
            x: this.dates,
            y: values,
            name: axisOption.label,
            type: 'scatter',
            yaxis: yaxis,
            line: { width: 5 }
          });
        }
      });

      let yAxisTitle: string = 'Energy Consumption';
      if(!hasEnergyData){
        yAxisTitle = 'Predictor Usage';
      }


      var layout = {
        height: 700,
        legend: {
          orientation: "h"
        },
        title: {
          // text: 'Time Series',
          // font: {
          //   size: 18
          // },
        },
        xaxis: {
          hoverformat: "%b, %y",
          automargin: true
        },
        yaxis: {
          title: {
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          tickmode: 'sync'
        },
        yaxis2: {
          title: {
            text: 'Predictor Usage',
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          side: 'right',
          overlaying: 'y',
          tickmode: 'sync'
        },
        // margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.timeSeries.nativeElement, traceData, layout, config);
    }
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
}
