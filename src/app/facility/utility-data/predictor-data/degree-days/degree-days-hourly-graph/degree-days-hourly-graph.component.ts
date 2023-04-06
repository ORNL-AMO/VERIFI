import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { DegreeDay } from 'src/app/models/degreeDays';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-degree-days-hourly-graph',
  templateUrl: './degree-days-hourly-graph.component.html',
  styleUrls: ['./degree-days-hourly-graph.component.css']
})
export class DegreeDaysHourlyGraphComponent {
  @Input()
  hourlySummaryData: Array<{ time: Date, degreeDays: number, dryBulbTemp: number, percentOfDay: number, degreeDifference: number }>;
  @Input()
  selectedDay: Date;


  @ViewChild('degreeDaysChart', { static: false }) degreeDaysChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.degreeDaysChart) {
      let traceData = [
        {
          x: this.hourlySummaryData.map(data => { return data.time }),
          y: this.hourlySummaryData.map(data => { return data.degreeDays }),
          type: 'bar'
        }
      ];

      var layout = {
        title: {
          text: 'Daily Degree Days <br>(' + Months[this.selectedDay.getMonth()].name + ', ' + this.selectedDay.getFullYear() + ')',
          font: {
            size: 18
          },
        },
        xaxis: {
          automargin: true,
        },
        yaxis: {
          automargin: true,
        },
        // margin: { "t": 0, "b": 0, "l": 0, "r": 0 },
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.degreeDaysChart.nativeElement, traceData, layout, config);
    }
  }
}
