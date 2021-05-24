import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { MonthlyData } from 'src/app/models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-matrix-scatter-plot',
  templateUrl: './matrix-scatter-plot.component.html',
  styleUrls: ['./matrix-scatter-plot.component.css']
})
export class MatrixScatterPlotComponent implements OnInit {

  @ViewChild('matrixScatterPlot', { static: false }) matrixScatterPlot: ElementRef;

  facilityMeterDataSub: Subscription;

  constructor(private plotlyService: PlotlyService, private predictorDbService: PredictordbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(() => {
      this.getPlotData();
    });
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges() {
    this.drawChart();
  }

  drawChart(): void {
    if (this.matrixScatterPlot) {

      var pl_colorscale = [
        [0.0, '#19d3f3'],
        [0.333, '#19d3f3'],
        [0.333, '#e763fa'],
        [0.666, '#e763fa'],
        [0.666, '#636efa'],
        [1, '#636efa']
      ]

      var axis = () => ({
        showline: false,
        zeroline: false,
        gridcolor: '#ffff',
        ticklen: 4,
        // automargin: true
      });

      let plotData = this.getPlotData();
      console.log(plotData);
      var data = [{
        type: 'splom',
        dimensions: plotData,
        text: plotData.map(data => { return data.label }),
        marker: {
          color: plotData.map(data => { return 1}),
          // colorscale: pl_colorscale,
          autocolorscale: true,
          size: 7,
          // line: {
          //   color: 'white',
          //   width: 0.5
          // }
        },
        diagonal:{
          visible: false
        },
        showupperhalf: false
      }]

      var layout = {
        margin: {
          t: 20,
          r: 20
        },
        // title: 'Iris Data set',
        height: 800,
        // width: 800,
        // autosize: false,
        // hovermode: 'closest',
        // dragmode: 'select',
        plot_bgcolor: 'rgba(240,240,240, 0.95)',
        xaxis: axis(),
        yaxis: axis(),
        xaxis2: axis(),
        xaxis3: axis(),
        xaxis4: axis(),
        yaxis2: axis(),
        yaxis3: axis(),
        yaxis4: axis(),
      }
      var config = { responsive: true };

      this.plotlyService.newPlot(this.matrixScatterPlot.nativeElement, data, layout, config);
    }
  }


  getPlotData(): Array<{ label: string, values: Array<number> }> {

    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
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


    let plotData: Array<{ label: string, values: Array<number> }> = new Array();
    let endDate: Date = _.max([new Date(lastBillEntry.date), new Date(lastPredictorEntry.date)]);
    calanderizedMeterData.forEach(calanderizedMeter => {
      let startDate: Date = _.min([new Date(firstBillEntry.date), new Date(firstPredictorEntry.date)]);
      let meterPlotData: { label: string, values: Array<number> } = {
        label: calanderizedMeter.meter.name,
        values: new Array()
      }
      while (startDate < endDate) {
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
    });

    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    facilityPredictors.forEach(predictor => {
      let startDate: Date = _.min([new Date(firstBillEntry.date), new Date(firstPredictorEntry.date)]);
      let predictorPlotData: { label: string, values: Array<number> } = {
        label: predictor.name,
        values: new Array()
      }
      while (startDate < endDate) {
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
    });
    return plotData;
  }

}
