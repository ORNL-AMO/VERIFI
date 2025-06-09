import { Component, ElementRef, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import * as _ from 'lodash';
import * as jStat from 'jstat';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { AxisOption, CorrelationPlotOptions, VisualizationStateService } from '../visualization-state.service';

@Component({
    selector: 'app-correlation-heatmap',
    templateUrl: './correlation-heatmap.component.html',
    styleUrls: ['./correlation-heatmap.component.css'],
    standalone: false
})
export class CorrelationHeatmapComponent {
  @ViewChild('heatMapPlot', { static: false }) heatMapPlot: ElementRef;

  correlationPlotOptions: CorrelationPlotOptions;
  constructor(private visualizationStateService: VisualizationStateService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.correlationPlotOptions = this.visualizationStateService.correlationPlotOptions.getValue();
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
    this.drawHeatMap();
  }

  drawHeatMap() {
    if (this.heatMapPlot) {
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
            } else {
              valuesArr.push(null);
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
                color: this.getFont(zValues[j][i]),
              },
              showarrow: false,
            };
            layout.annotations.push(result);
          }
        }
        let config = {
          modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
          displaylogo: false,
          responsive: true
        };
        this.plotlyService.newPlot(this.heatMapPlot.nativeElement, data, layout, config);
      }
    }
  }

  getFont(value: number): string {
    if (value && isNaN(value) == false) {
      if (value > .5 || value < .2) {
        return "white";
      } else {
        return "black";
      }
    }
    return "white";
  }

  getSigFigs(val: number): number {
    return Number((val).toLocaleString(undefined, { maximumSignificantDigits: 3 }));
  }


  getData(): Array<{
    option: AxisOption,
    values: Array<number>
  }> {
    let allAxisOptions: Array<{
      option: AxisOption,
      values: Array<number>
    }> = new Array();

    let dates: Array<Date> = this.visualizationStateService.getDates();

    this.correlationPlotOptions.r2PredictorOptions.forEach(option => {
      if (option.selected) {
        allAxisOptions.push({
          option: option,
          values: this.visualizationStateService.getValues(option, dates)
        });
      }
    });
    if (this.correlationPlotOptions.asMeters) {
      this.correlationPlotOptions.r2MeterOptions.forEach(meterOption => {
        if (meterOption.selected) {
          allAxisOptions.push({
            option: meterOption,
            values: this.visualizationStateService.getValues(meterOption, dates)
          });
        }
      })
    } else {
      this.correlationPlotOptions.r2GroupOptions.forEach(groupOption => {
        if (groupOption.selected) {
          allAxisOptions.push({
            option: groupOption,
            values: this.visualizationStateService.getValues(groupOption, dates)
          });
        }
      });
    };
    return allAxisOptions;
  }

  getR2(xValues: Array<number>, yValue: Array<number>) {
    let endog: Array<number> = xValues;
    let exog: Array<Array<number>> = yValue.map(val => { return [1, val] });
    try {
      let model: JStatRegressionModel = jStat.models.ols(endog, exog);
      return model.R2;
    } catch (err) {
      return undefined;
    }
  }
}
