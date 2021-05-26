import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { MonthlyData } from 'src/app/models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import * as regression from 'regression';
import * as jStat from 'jstat';

@Component({
  selector: 'app-matrix-scatter-plot',
  templateUrl: './matrix-scatter-plot.component.html',
  styleUrls: ['./matrix-scatter-plot.component.css']
})
export class MatrixScatterPlotComponent implements OnInit {

  @ViewChild('matrixPlot', { static: false }) matrixPlot: ElementRef;

  facilityMeterDataSub: Subscription;
  metersSub: Subscription;
  meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }>;

  facilityPredictorsSub: Subscription;
  predictorOptions: Array<{ predictor: PredictorData, selected: boolean }>;

  regressionTableData: Array<RegressionTableDataItem>;
  plotData: Array<PlotDataItem>;
  dataView: "heatmap" | "splom" = "splom";
  numberOfSelectedOptions: number = 0;
  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  constructor(private plotlyService: PlotlyService, private predictorDbService: PredictordbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(predictors => {
      if (!this.predictorOptions && predictors) {
        this.setPredictorOptions(predictors);
      } else {
        let existingPredictorIds: Array<string> = this.predictorOptions.map(option => { return option.predictor.id });
        let checkMissing: PredictorData = predictors.find(predictor => { return !existingPredictorIds.includes(predictor.id) });
        if (checkMissing) {
          this.setPredictorOptions(predictors);
        }
      }
    });

    this.metersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      if (!this.meterOptions && facilityMeters) {
        this.setMeterOptions(facilityMeters);
      } else {
        let existingMeterIds: Array<number> = this.meterOptions.map(option => { return option.meter.id });
        let checkMissing: IdbUtilityMeter = facilityMeters.find(meter => { return !existingMeterIds.includes(meter.id) });
        if (checkMissing) {
          this.setMeterOptions(facilityMeters);
        }
      }
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(() => {
      this.setData();
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
    this.facilityPredictorsSub.unsubscribe();
    this.metersSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges() {
    this.drawChart();
  }

  setData() {
    if (this.meterOptions && this.predictorOptions) {
      this.plotData = this.getPlotData();
      this.regressionTableData = this.getRegressionTableData(this.plotData);
    }
  }

  setPredictorOptions(predictors: Array<PredictorData>) {
    this.predictorOptions = new Array();
    predictors.forEach(predictor => {
      this.predictorOptions.push({
        predictor: predictor,
        selected: true
      });
    });
  }

  setMeterOptions(facilityMeters: Array<IdbUtilityMeter>) {
    this.meterOptions = new Array();
    facilityMeters.forEach(meter => {
      this.meterOptions.push({
        meter: meter,
        selected: true
      });
    });
  }



  drawChart(): void {
    if (this.matrixPlot && this.plotData && this.regressionTableData) {
      this.numberOfSelectedOptions = this.plotData.length;
      this.cd.detectChanges();
      if (this.numberOfSelectedOptions > 2) {
        if (this.dataView == 'splom') {
          this.drawSplom();
        } else {
          this.drawHeatMap();
        }
      } else {
        if (this.numberOfSelectedOptions == 2) {
          this.drawScatterPlot();
        } else {
          //IDK..
        }
      }
    }
  }

  drawSplom() {
    var axis = {
      showline: false,
      zeroline: false,
      gridcolor: '#ffff',
      ticklen: 4,
    };
    let data = [{
      type: 'splom',
      dimensions: this.plotData,
      text: this.plotData[0].valueDates.map(valueDate => { return this.monthNames[valueDate.getMonth()] + ', ' + valueDate.getFullYear() }),
      marker: {
        color: this.plotData.map(() => { return 1 }),
        autocolorscale: true,
        size: 7,
      },
      diagonal: {
        visible: false
      },
      showupperhalf: false,
      hovertemplate: "%{text}<br> %{yaxis.title.text}: %{y}<br>%{xaxis.title.text}: %{x}<br><extra></extra>"
    }]

    let layout = {
      title: 'Correlation',
      height: 800,
      plot_bgcolor: 'rgba(240,240,240, 0.95)',
      xaxis: axis,
      yaxis: axis,
      xaxis2: axis,
      xaxis3: axis,
      xaxis4: axis,
      yaxis2: axis,
      yaxis3: axis,
      yaxis4: axis,
    }
    let config = {
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.matrixPlot.nativeElement, data, layout, config);
  }


  drawScatterPlot() {
    let trace1 = {
      x: this.plotData[0].values,
      y: this.plotData[1].values,
      text: this.plotData[0].valueDates.map(valueDate => { return this.monthNames[valueDate.getMonth()] + ', ' + valueDate.getFullYear() }),
      mode: 'markers',
      type: 'scatter',
      name: "Plot Data",
      marker: {
        color: this.plotData[0].values.map(() => { return 'black' }),
      },
      hovertemplate: "%{text}<br>%{yaxis.title.text}: %{y}<br>%{xaxis.title.text}: %{x}<br><extra></extra>"
    };


    let xMin: number = _.min(this.plotData[0].values);
    let xMax: number = _.max(this.plotData[0].values);

    let yMinRegressionValue: number = this.regressionTableData[0].regressionResult.predict(xMin)[1];
    let yMaxRegressionValue: number = this.regressionTableData[0].regressionResult.predict(xMax)[1];
    let trace2 = {
      x: [xMin, xMax],
      y: [yMinRegressionValue, yMaxRegressionValue],
      mode: "lines",
      type: "scatter",
      name: "Best Fit: " + this.regressionTableData[0].regressionResult.string,
      hoverinfo: 'none'
    }

    let data = [trace1, trace2];
    let layout = {
      plot_bgcolor: 'rgba(240,240,240, 0.95)',
      title: 'Correlation',
      xaxis: {
        title: this.plotData[0].label
      },
      yaxis: {
        title: this.plotData[1].label
      },
      annotations: [{
        xref: 'paper',
        yref: 'paper',
        x: .05,
        y: .9,
        xanchor: 'left',
        yanchor: 'top',
        showarrow: false,
        text: "Best Fit:<br>" + this.regressionTableData[0].regressionResult.string + "<br>R&#178;: " + this.regressionTableData[0].r2Value + "<br>P-value: " + this.regressionTableData[0].pValue,
        borderwidth: 2,
        borderpad: 4,
        bgcolor: '#fff',
        opacity: 0.8
      }],
      showlegend: false
    }
    let config = {
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.matrixPlot.nativeElement, data, layout, config);
  }

  drawHeatMap() {
    //heat map 
    var xValues: Array<string> = this.plotData.map(data => { return data.label });
    //pop and reverse used to correctly order labels to match splom
    xValues.pop();
    var yValues: Array<string> = this.plotData.map(data => { return data.label });
    yValues = yValues.reverse();
    yValues.pop();

    var zValues: Array<Array<number>> = new Array<Array<number>>();
    for (let y = 0; y < yValues.length; y++) {
      let valuesArr: Array<number> = new Array();
      for (let x = 0; x < xValues.length; x++) {
        let zValue = this.regressionTableData.find(tableItem => { return tableItem.optionOne == xValues[x] && tableItem.optionTwo == yValues[y] });
        if (zValue) {
          valuesArr.push(zValue.r2Value);
        }
      }
      zValues.push(valuesArr);
    }

    var data = [{
      x: xValues,
      y: yValues,
      z: zValues,
      type: 'heatmap',
      // hovertemplate: '%{x} vs %{y} : %{z} <extra></extra>'
    }];

    var layout = {
      title: 'R&#178; Variance',
      annotations: []
    };

    for (let i = 0; i < xValues.length; i++) {
      for (let j = 0; j < yValues.length; j++) {
        let result = {
          xref: 'x1',
          yref: 'y1',
          x: xValues[i],
          y: yValues[j],
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
    this.plotlyService.newPlot(this.matrixPlot.nativeElement, data, layout, config);
  }

  toggleMeterOption(index: number) {
    this.meterOptions[index].selected = !this.meterOptions[index].selected;
    this.setData();
    this.drawChart();
  }

  togglePredictorOption(index: number) {
    this.predictorOptions[index].selected = !this.predictorOptions[index].selected;
    this.setData();
    this.drawChart();
  }

  getPlotData(): Array<PlotDataItem> {

    let facilityMeters: Array<IdbUtilityMeter> = new Array();
    this.meterOptions.forEach(meterOption => {
      if (meterOption.selected) {
        facilityMeters.push(meterOption.meter);
      }
    });
    let calanderizedMeterData = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false);
    let lastBillEntry: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let firstBillEntry: MonthlyData = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let lastPredictorEntry: IdbPredictorEntry = _.maxBy(facilityPredictorEntries, (data: IdbPredictorEntry) => {
      let date = new Date(data.date);
      return date;
    });

    let firstPredictorEntry: IdbPredictorEntry = _.minBy(facilityPredictorEntries, (data: IdbPredictorEntry) => {
      let date = new Date(data.date);
      return date;
    });


    let plotData: Array<PlotDataItem> = new Array();
    let endDate: Date = this.getLastDate(lastBillEntry, lastPredictorEntry);

    calanderizedMeterData.forEach(calanderizedMeter => {
      let startDate: Date = this.getLastDate(firstBillEntry, firstPredictorEntry);
      let meterPlotData: PlotDataItem = {
        label: calanderizedMeter.meter.name,
        values: new Array(),
        valueDates: new Array()
      }
      if (startDate && endDate) {
        while (startDate < endDate) {
          meterPlotData.valueDates.push(new Date(startDate));
          let meterData: MonthlyData = calanderizedMeter.monthlyData.find(dataItem => {
            return (dataItem.monthNumValue == startDate.getUTCMonth() && dataItem.year == startDate.getUTCFullYear());
          });
          if (meterData) {
            meterPlotData.values.push(meterData.energyUse);
          } else {
            meterPlotData.values.push(0);
          }
          startDate.setMonth(startDate.getMonth() + 1)
        };
        plotData.push(meterPlotData);
      }
    });

    let facilityPredictors: Array<PredictorData> = new Array();
    this.predictorOptions.forEach(predictorOption => {
      if (predictorOption.selected) {
        facilityPredictors.push(predictorOption.predictor);
      }
    })
    facilityPredictors.forEach(predictor => {
      let startDate: Date = this.getLastDate(firstBillEntry, firstPredictorEntry);
      let predictorPlotData: PlotDataItem = {
        label: predictor.name,
        values: new Array(),
        valueDates: new Array()
      }
      if (startDate && endDate) {
        while (startDate < endDate) {
          predictorPlotData.valueDates.push(new Date(startDate));
          let facilityPredictor: IdbPredictorEntry = facilityPredictorEntries.find(dataItem => {
            let dataItemDate: Date = new Date(dataItem.date);
            return (dataItemDate.getUTCMonth() == startDate.getUTCMonth() && dataItemDate.getUTCFullYear() == startDate.getUTCFullYear());
          });
          if (facilityPredictor) {
            let predictorData: PredictorData = facilityPredictor.predictors.find(predictorEntry => { return predictorEntry.id == predictor.id });
            predictorPlotData.values.push(predictorData.amount);
          } else {
            predictorPlotData.values.push(0);
          }
          startDate.setMonth(startDate.getMonth() + 1)
        };
        plotData.push(predictorPlotData);
      }
    });
    return plotData;
  }


  getLastDate(monthlyData?: MonthlyData, predictorEntry?: IdbPredictorEntry): Date {
    let lastDate: Date;
    if (monthlyData && predictorEntry) {
      lastDate = _.max([new Date(monthlyData.date), new Date(predictorEntry.date)]);
    } else if (monthlyData) {
      lastDate = new Date(monthlyData.date);
    } else if (predictorEntry) {
      lastDate = new Date(predictorEntry.date);
    }
    return lastDate;
  }

  getRegressionTableData(plotData: Array<{ label: string, values: Array<number> }>): Array<RegressionTableDataItem> {
    let regressionTableData = new Array<RegressionTableDataItem>();
    for (let x = 0; x < plotData.length; x++) {
      for (let y = (x + 1); y < plotData.length; y++) {
        let regressionDataPairs: Array<Array<number>> = plotData[x].values.map((value, index) => { return [value, plotData[y].values[index]] });
        let regressionResult = regression.linear(regressionDataPairs);
        // debugger
        // console.log(plotData[x].label + ' v ' + plotData[y].label)
        // let xVals = regressionDataPairs.map(pair => { return [1, pair[0]] });
        // let yVals = regressionDataPairs.map(pair => { return pair[1] });
        // console.log(xVals);
        // console.log(yVals);
        // let jstatResult = jStat.models.ols(xVals, yVals);
        // console.log(jstatResult);
        // let jstatResultFScore = jStat.anovafscore(xVals, yVals);
        // console.log(jstatResult);
        regressionTableData.push({
          optionOne: plotData[x].label,
          optionTwo: plotData[y].label,
          r2Value: regressionResult.r2,
          regressionResult: regressionResult,
          pValue: 0
        });
      }
    }
    return regressionTableData;
  }


  setView(str: "heatmap" | "splom") {
    this.dataView = str;
    this.drawChart();
  }
}


export interface PlotDataItem {
  label: string,
  values: Array<number>,
  valueDates: Array<Date>
}

export interface RegressionTableDataItem {
  optionOne: string,
  optionTwo: string,
  r2Value: number,
  //result from regression library
  regressionResult: any,
  pValue: number
}