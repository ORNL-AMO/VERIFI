import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent implements OnInit {

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
     private utilityMeterDbService: UtilityMeterdbService, private cd: ChangeDetectorRef,
    private visualizationService: VisualizationService) { }

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
      let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
      this.plotData = this.visualizationService.getPlotData(this.predictorOptions, this.meterOptions, facilityPredictorEntries);
      this.regressionTableData = this.visualizationService.getRegressionTableData(this.plotData);
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
    this.numberOfSelectedOptions = this.plotData.length;
    if (this.matrixPlot && this.plotData && this.regressionTableData) {
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
      spikecolor: "#000"
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
      hovertemplate: "%{text}<br>%{yaxis.title.text}: %{y}<br>%{xaxis.title.text}: %{x}<br><extra></extra>"
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

  setView(str: "heatmap" | "splom") {
    this.dataView = str;
    this.drawChart();
  }
}
