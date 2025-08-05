import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AxisOption, VisualizationStateService } from '../../visualization-state.service';
import * as jStat from 'jstat';
import { JStatRegressionModel } from 'src/app/models/analysis';
import * as _ from 'lodash';
import { RegressionTableDataItem } from 'src/app/models/visualization';

@Component({
    selector: 'app-correlation-plot-graph-item',
    templateUrl: './correlation-plot-graph-item.component.html',
    styleUrls: ['./correlation-plot-graph-item.component.css'],
    standalone: false
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
  constructor(private plotlyService: PlotlyService, private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.dates = this.visualizationStateService.getDates();
    this.xValues = this.visualizationStateService.getValues(this.axisCombo.x, this.dates);
    this.yValues = this.visualizationStateService.getValues(this.axisCombo.y, this.dates);
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
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.matrixPlot.nativeElement, data, layout, config);
  }

  getSigFigs(val: number): string {
    return (val).toLocaleString(undefined, { maximumSignificantDigits: 5 });
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
