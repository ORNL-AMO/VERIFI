import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import * as _ from 'lodash';
import { AxisOption, CorrelationPlotOptions, VisualizationStateService } from '../visualization-state.service';

@Component({
    selector: 'app-time-series',
    templateUrl: './time-series.component.html',
    styleUrls: ['./time-series.component.css'],
    standalone: false
})
export class TimeSeriesComponent implements OnInit {

  @ViewChild('timeSeries', { static: false }) timeSeries: ElementRef;
  correlationPlotOptions: CorrelationPlotOptions;
  constructor(private plotlyService: PlotlyService, private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.correlationPlotOptions = this.visualizationStateService.correlationPlotOptions.getValue();
  }


  ngAfterViewInit() {
    this.drawTimeSeries();
  }


  drawTimeSeries() {
    if (this.timeSeries) {
      let traceData = new Array();
      let y1Labels: Array<string> = new Array();
      let y2Labels: Array<string> = new Array();
      let dates: Array<Date> = this.visualizationStateService.getDates();
      if (this.correlationPlotOptions.asMeters) {
        this.correlationPlotOptions.timeSeriesMeterYAxis1Options.forEach(axisOption => {
          if (axisOption.selected) {
            y1Labels.push(axisOption.label);
            let values: Array<number> = this.visualizationStateService.getValues(axisOption, dates);
            traceData.push({
              x: dates,
              y: values,
              name: axisOption.label,
              type: 'scatter',
              yaxis: 'y',
              line: { width: 3 },
            });
          }
        })
        this.correlationPlotOptions.timeSeriesMeterYAxis2Options.forEach(axisOption => {
          if (axisOption.selected) {
            y2Labels.push(axisOption.label);
            let values: Array<number> = this.visualizationStateService.getValues(axisOption, dates);
            traceData.push({
              x: dates,
              y: values,
              name: axisOption.label,
              type: 'scatter',
              yaxis: 'y2',
              line: { width: 3, dash: 'dashdot' }
            });
          }
        })
      } else {
        this.correlationPlotOptions.timeSeriesGroupYAxis1Options.forEach(axisOption => {
          if (axisOption.selected) {
            y1Labels.push(axisOption.label);
            let values: Array<number> = this.visualizationStateService.getValues(axisOption, dates);
            traceData.push({
              x: dates,
              y: values,
              name: axisOption.label,
              type: 'scatter',
              yaxis: 'y',
              line: { width: 3 }
            });
          }
        });
        this.correlationPlotOptions.timeSeriesGroupYAxis2Options.forEach(axisOption => {
          if (axisOption.selected) {
            y2Labels.push(axisOption.label);
            let values: Array<number> = this.visualizationStateService.getValues(axisOption, dates);
            traceData.push({
              x: dates,
              y: values,
              name: axisOption.label,
              type: 'scatter',
              yaxis: 'y2',
              line: { width: 3, dash: 'dashdot' }
            });
          }
        });
      }

      this.correlationPlotOptions.timeSeriesPredictorYAxis1Options.forEach(axisOption => {
        if (axisOption.selected) {
          y1Labels.push(axisOption.label);
          let values: Array<number> = this.visualizationStateService.getValues(axisOption, dates);
          traceData.push({
            x: dates,
            y: values,
            name: axisOption.label,
            type: 'scatter',
            yaxis: 'y',
            line: { width: 3 }
          });
        }
      });

      this.correlationPlotOptions.timeSeriesPredictorYAxis2Options.forEach(axisOption => {
        if (axisOption.selected) {
          y2Labels.push(axisOption.label);
          let values: Array<number> = this.visualizationStateService.getValues(axisOption, dates);
          traceData.push({
            x: dates,
            y: values,
            name: axisOption.label,
            type: 'scatter',
            yaxis: 'y2',
            line: { width: 3, dash: 'dashdot' }
          });
        }
      });


      if (this.correlationPlotOptions.totalEnergyTimeSeriesYAxis1) {
        y1Labels.push('Total Facility Energy');
        let values: Array<number> = this.visualizationStateService.getTotalEnergyUse(dates);
        traceData.push({
          x: dates,
          y: values,
          name: 'Total Facility Energy',
          type: 'scatter',
          yaxis: 'y',
          line: { width: 3 }
        });
      }

      if (this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis1) {
        y1Labels.push('Total Selected Energy');
        let axisOptions: Array<AxisOption> = this.correlationPlotOptions.timeSeriesGroupYAxis1Options;
        if (this.correlationPlotOptions.asMeters) {
          axisOptions = this.correlationPlotOptions.timeSeriesMeterYAxis1Options;
        }
        let values: Array<number> = this.visualizationStateService.getTotalEnergyUse(dates, axisOptions, this.correlationPlotOptions.asMeters);
        traceData.push({
          x: dates,
          y: values,
          name: 'Total Selected Energy',
          type: 'scatter',
          yaxis: 'y',
          line: { width: 3 }
        });
      }

      if (this.correlationPlotOptions.totalEnergyTimeSeriesYAxis2) {
        y2Labels.push('Total Facility Energy');
        let values: Array<number> = this.visualizationStateService.getTotalEnergyUse(dates);
        traceData.push({
          x: dates,
          y: values,
          name: 'Total Energy',
          type: 'scatter',
          yaxis: 'y2',
          line: { width: 3, dash: 'dashdot' }
        });
      }

      if (this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis2) {
        y1Labels.push('Total Selected Energy');
        let axisOptions: Array<AxisOption> = this.correlationPlotOptions.timeSeriesGroupYAxis2Options;
        if (this.correlationPlotOptions.asMeters) {
          axisOptions = this.correlationPlotOptions.timeSeriesMeterYAxis2Options;
        }
        let values: Array<number> = this.visualizationStateService.getTotalEnergyUse(dates, axisOptions, this.correlationPlotOptions.asMeters);
        traceData.push({
          x: dates,
          y: values,
          name: 'Total Energy',
          type: 'scatter',
          yaxis: 'y2',
          line: { width: 3, dash: 'dashdot' }
        });
      }



      var layout = {
        // height: 700,
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
          automargin: true,
          showspikes: true
        },
        yaxis: {
          title: {
            text: this.getAxisTitle(y1Labels),
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          tickmode: 'sync',
          showspikes: true
        },
        yaxis2: {
          title: {
            text: this.getAxisTitle(y2Labels),
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          side: 'right',
          overlaying: 'y',
          tickmode: 'sync',
          showspikes: true

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

  getAxisTitle(labels: Array<string>): string {
    let title: string = '';
    labels.forEach((label, index) => {
      if (index == 0) {
        title = label;
      } else if ((index % 4) == 0) {
        title = title + ',<br>' + label;
      } else {
        title = title + ', ' + label;
      }
    });
    return title;
  }
}
