import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import { VisualizationStateService } from '../visualization-state.service';

@Component({
  selector: 'app-correlation-heatmap',
  templateUrl: './correlation-heatmap.component.html',
  styleUrls: ['./correlation-heatmap.component.css']
})
export class CorrelationHeatmapComponent implements OnInit {

  @ViewChild('heatMapPlot', { static: false }) heatMapPlot: ElementRef;


  regressionTableData: Array<RegressionTableDataItem>;
  plotData: Array<PlotDataItem>;
  plotDataSub: Subscription;
  regressionTableDataSub: Subscription;
  constructor(private visualizationStateService: VisualizationStateService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      this.plotData = plotData;
      this.drawChart();
    });

    this.regressionTableDataSub = this.visualizationStateService.regressionTableData.subscribe(regressionTableData => {
      this.regressionTableData = regressionTableData;
      this.drawChart();
    })
  }

  ngOnDestroy(){
    this.plotDataSub.unsubscribe();
    this.regressionTableDataSub.unsubscribe();
  }

  ngAfterViewInit(){
    this.drawChart();
  }

  drawChart(): void {
    if (this.heatMapPlot && this.plotData && this.regressionTableData) {
      this.drawHeatMap();      
    }
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
          valuesArr.push(this.getSigFigs(zValue.r2Value));
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
      x: xValues,
      y: yValues,
      z: zValues,
      type: 'heatmap',
      // hovertemplate: '%{x} vs %{y} : %{z} <extra></extra>'
    }];

    var layout = {
      height: 700,
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
    this.plotlyService.newPlot(this.heatMapPlot.nativeElement, data, layout, config);
  }

  
  getSigFigs(val: number): number {
    return Number((val).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
  }
}
