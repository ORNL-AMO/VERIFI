import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { AxisOption, VisualizationStateService } from '../../../visualization-state.service';
import * as jStat from 'jstat';
import { JStatRegressionModel } from 'src/app/models/analysis';
import * as _ from 'lodash';
import { RegressionTableDataItem } from 'src/app/models/visualization';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';

@Component({
  selector: 'app-correlation-plot-graph-item',
  templateUrl: './correlation-plot-graph-item.component.html',
  styleUrls: ['./correlation-plot-graph-item.component.css']
})
export class CorrelationPlotGraphItemComponent {
  @Input()
  axisCombo: { x: AxisOption, y: AxisOption };

  @ViewChild('matrixPlot', { static: false }) matrixPlot: ElementRef;
  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  xValues: Array<number>;
  yValues: Array<number>;
  dates: Array<Date>;
  regressionTableDataItem: RegressionTableDataItem
  bestFit: string;
  constructor(private plotlyService: PlotlyService, private visualizationStateService: VisualizationStateService,
    private predictorDbService: PredictordbService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.setDates();
    this.xValues = this.getValues(this.axisCombo.x);
    this.yValues = this.getValues(this.axisCombo.y);
    this.setRegressionPlotDataItem();
  }

  ngAfterViewInit() {
    this.drawScatterPlot();
  }

  drawScatterPlot() {
    let trace1 = {
      x: this.xValues,
      y: this.yValues,
      text: this.dates.map(valueDate => { return this.monthNames[valueDate.getMonth()] + ', ' + valueDate.getFullYear() }),
      mode: 'markers',
      type: 'scatter',
      name: "Plot Data",
      marker: {
        color: this.xValues.map(() => { return 'black' }),
      },
      hovertemplate: "%{text}<br>%{yaxis.title.text}: %{y}<br>%{xaxis.title.text}: %{x}<br><extra></extra>"
    };

    let data = [trace1];

    if (this.regressionTableDataItem) {
      let xMin: number = _.min(this.xValues);
      let xMax: number = _.max(this.xValues);
      let yMinRegressionValue: number = this.regressionTableDataItem.jstatModel.coef[0] + (this.regressionTableDataItem.jstatModel.coef[1] * xMin);
      let yMaxRegressionValue: number = this.regressionTableDataItem.jstatModel.coef[0] + (this.regressionTableDataItem.jstatModel.coef[1] * xMax);

      let trace2 = {
        x: [xMin, xMax],
        y: [yMinRegressionValue, yMaxRegressionValue],
        mode: "lines",
        type: "scatter",
        name: "Best Fit: " + this.bestFit,
        hoverinfo: 'none',
        marker: {
          color: undefined
        },
        hovertemplate: '',
        text: []
      }
      data.push(trace2);
    }


    let layout = {
      plot_bgcolor: 'rgba(240,240,240, 0.95)',
      xaxis: {
        title: this.axisCombo.x.label
      },
      yaxis: {
        title: this.axisCombo.y.label
      },
      showlegend: false,
      margin: { t: 0 }
    }
    let config = {
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.matrixPlot.nativeElement, data, layout, config);
  }

  getSigFigs(val: number): string {
    return (val).toLocaleString(undefined, { maximumSignificantDigits: 5 });
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

  setRegressionPlotDataItem() {
    let endog: Array<number> = this.yValues;
    let exog: Array<Array<number>> = this.xValues.map(val => { return [1, val] });
    try {
      let model: JStatRegressionModel = jStat.models.ols(endog, exog);
      this.regressionTableDataItem = {
        optionOne: this.axisCombo.x.label,
        optionTwo: this.axisCombo.y.label,
        r2Value: model.R2,
        pValue: model.f.pvalue,
        jstatModel: model
      };
      let coefStr: Array<string> = new Array();
      this.regressionTableDataItem.jstatModel.coef.forEach(coef => {
        let str: string = this.getSigFigs(coef);
        coefStr.push(str);
      });

      this.bestFit = coefStr[0] + ' + ' + '(' + coefStr[1] + ' * ' + this.regressionTableDataItem.optionOne + ')';

    } catch (err) {

    }
  }
}
