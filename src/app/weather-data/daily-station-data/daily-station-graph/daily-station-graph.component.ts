import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-daily-station-graph',
  templateUrl: './daily-station-graph.component.html',
  styleUrls: ['./daily-station-graph.component.css']
})
export class DailyStationGraphComponent {
  @Input()
  hourlySummaryData: Array<DetailDegreeDay>;
  @Input()
  selectedDate: Date;
  @Input()
  heatingTemp: number;
  @Input()
  coolingTemp: number;


  @ViewChild('degreeDaysChart', { static: false }) degreeDaysChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes.selectedDate && !changes.selectedDate.isFirstChange()) || (changes.hourlySummaryData && !changes.hourlySummaryData.isFirstChange())) {
      this.drawChart();
    }
  }


  drawChart() {
    if (this.degreeDaysChart) {
      let traceData = [
        {
          x: this.hourlySummaryData.map(data => { return data.time }),
          y: this.hourlySummaryData.map(data => { return data.heatingDegreeDay }),
          type: 'bar',
          name: 'Heating Degree Days',
          yaxis: 'y'
        },

        {
          x: this.hourlySummaryData.map(data => { return data.time }),
          y: this.hourlySummaryData.map(data => { return data.coolingDegreeDay }),
          type: 'bar',
          name: 'Cooling Degree Days',
          yaxis: 'y'
        },
        {
          x: this.hourlySummaryData.map(data => { return data.time }),
          y: this.hourlySummaryData.map(data => { return data.dryBulbTemp }),
          type: 'scatter',
          name: 'Dry Bulb Temp Readings',
          yaxis: 'y2',
          mode: 'lines+markers'
        },
        {
          x: this.hourlySummaryData.map(data => { return data.time }),
          y: this.hourlySummaryData.map(data => { return this.heatingTemp }),
          type: 'scatter',
          name: 'Heating Base Temp',
          yaxis: 'y2',
          // mode: 'lines+markers'
        },
        {
          x: this.hourlySummaryData.map(data => { return data.time }),
          y: this.hourlySummaryData.map(data => { return this.coolingTemp }),
          type: 'scatter',
          name: 'Cooling Base Temp',
          yaxis: 'y2',
          // mode: 'lines+markers'
        }
      ];

      var layout = {
        legend: {
          orientation: "h"
        },
        title: {
          text: 'Degree Days <br>(' + Months[this.selectedDate.getMonth()].name + ' ' + this.selectedDate.getDate() + ', ' + this.selectedDate.getFullYear() + ')',
          font: {
            size: 18
          },
        },
        xaxis: {
          automargin: true,
        },
        yaxis: {
          automargin: true,
          title: {
            text: 'Heating Degree Days'
          },
        },
        yaxis2: {
          title: {
            text: 'Dry Bulb Temp'
          },
          automargin: true,
          overlaying: 'y',
          side: 'right',
          // dtick: yAxis2Dtick,
          rangemode: 'tozero',
          tickmode: 'sync'
        },
        barmode: 'group'
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
