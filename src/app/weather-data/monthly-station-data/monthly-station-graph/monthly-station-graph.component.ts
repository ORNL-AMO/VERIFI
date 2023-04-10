import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { DegreeDay } from 'src/app/models/degreeDays';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-monthly-station-graph',
  templateUrl: './monthly-station-graph.component.html',
  styleUrls: ['./monthly-station-graph.component.css']
})
export class MonthlyStationGraphComponent {
  @Input()
  degreeDays: Array<DegreeDay>;
  @Input()
  selectedMonth: Date;


  @ViewChild('degreeDaysChart', { static: false }) degreeDaysChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.degreeDays && !changes.degreeDays.isFirstChange()) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.degreeDaysChart) {
      let traceData = [
        {
          x: this.degreeDays.map(data => { return data.date }),
          y: this.degreeDays.map(data => { return data.numberOfDays }),
          type: 'bar'
        }
      ];

      var layout = {
        title: {
          text: 'Daily Degree Days <br>(' + Months[this.selectedMonth.getMonth()].name + ', ' + this.selectedMonth.getFullYear() + ')',
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
