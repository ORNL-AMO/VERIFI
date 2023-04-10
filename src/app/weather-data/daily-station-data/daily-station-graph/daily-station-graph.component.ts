import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-daily-station-graph',
  templateUrl: './daily-station-graph.component.html',
  styleUrls: ['./daily-station-graph.component.css']
})
export class DailyStationGraphComponent {
  @Input()
  hourlySummaryData: Array<{ time: Date, degreeDays: number, dryBulbTemp: number, percentOfDay: number, degreeDifference: number }>;
  @Input()
  selectedDate: Date;


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
          y: this.hourlySummaryData.map(data => { return data.degreeDays }),
          type: 'bar'
        }
      ];

      var layout = {
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
