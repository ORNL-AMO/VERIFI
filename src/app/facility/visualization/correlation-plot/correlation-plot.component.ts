import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { PlotDataItem, RegressionTableDataItem } from 'src/app/models/visualization';
import * as _ from 'lodash';
import { VisualizationStateService } from '../visualization-state.service';

@Component({
  selector: 'app-correlation-plot',
  templateUrl: './correlation-plot.component.html',
  styleUrls: ['./correlation-plot.component.css']
})
export class CorrelationPlotComponent implements OnInit {

  @ViewChild('matrixPlot', { static: false }) matrixPlot: ElementRef;

  regressionTableData: Array<RegressionTableDataItem>;
  plotData: Array<PlotDataItem>;
  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  plotDataSub: Subscription;
  regressionTableDataSub: Subscription;
  constructor(private plotlyService: PlotlyService, private cd: ChangeDetectorRef, private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      this.plotData = plotData;
    });

    this.regressionTableDataSub = this.visualizationStateService.regressionTableData.subscribe(regressionTableData => {
      this.regressionTableData = regressionTableData;
      //regression data updates with plot data
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.plotDataSub.unsubscribe();
    this.regressionTableDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges() {
    this.drawChart();
  }

  drawChart(): void {
    if (this.matrixPlot && this.plotData && this.regressionTableData && this.regressionTableData.length != 0) {
      this.cd.detectChanges();
      if (this.plotData.length > 2) {
        this.drawSplom();
      } else if (this.plotData.length == 2) {
        this.drawScatterPlot();
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
      title: 'Data Correlation',
      height: 700,
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

    let coefStr: Array<string> = new Array();
    this.regressionTableData[0].jstatModel.coef.forEach(coef => {
      let str: string = this.getSigFigs(coef);
      coefStr.push(str);
    })

    let yMinRegressionValue: number = this.regressionTableData[0].jstatModel.coef[0] + (this.regressionTableData[0].jstatModel.coef[1] * xMin);
    let yMaxRegressionValue: number = this.regressionTableData[0].jstatModel.coef[0] + (this.regressionTableData[0].jstatModel.coef[1] * xMax);
    let bestFit: string = coefStr[0] + ' + ' + '(' + coefStr[1] + ' * ' + this.regressionTableData[0].optionOne + ')';

    let trace2 = {
      x: [xMin, xMax],
      y: [yMinRegressionValue, yMaxRegressionValue],
      mode: "lines",
      type: "scatter",
      name: "Best Fit: " + bestFit,
      hoverinfo: 'none'
    }

    let data = [trace1, trace2];
    let layout = {
      height: 800,
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
        text: "Best Fit:<br>" + bestFit + "<br>R&#178;: " + this.getSigFigs(this.regressionTableData[0].r2Value) + "<br>P-value: " + this.getSigFigs(this.regressionTableData[0].pValue),
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

  getSigFigs(val: number): string {
    return (val).toLocaleString(undefined, { maximumSignificantDigits: 5 });
  }
}
