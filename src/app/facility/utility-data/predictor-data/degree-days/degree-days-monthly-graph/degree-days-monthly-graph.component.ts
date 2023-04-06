import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-degree-days-monthly-graph',
  templateUrl: './degree-days-monthly-graph.component.html',
  styleUrls: ['./degree-days-monthly-graph.component.css']
})
export class DegreeDaysMonthlyGraphComponent {
  @Input()
  yearSummaryData: Array<{ date: Date, amount: number }>;
  @Input()
  selectedYear: number;


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
          x: this.yearSummaryData.map(data => { return Months[data.date.getMonth()].name }),
          y: this.yearSummaryData.map(data => { return data.amount }),
          type: 'bar'
        }
      ];

      var layout = {
        title: {
          text: 'Monthly Degree Days <br>(' + this.selectedYear + ')',
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
