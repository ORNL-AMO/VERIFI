import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-annual-station-graph',
  templateUrl: './annual-station-graph.component.html',
  styleUrls: ['./annual-station-graph.component.css']
})
export class AnnualStationGraphComponent {
  @Input()
  yearSummaryData: Array<{ date: Date, heatingDegreeDays: number, coolingDegreeDays: number  }>;
  @Input()
  selectedYear: number;


  @ViewChild('degreeDaysChart', { static: false }) degreeDaysChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(change: SimpleChanges) {
    if (change.yearSummaryData && !change.yearSummaryData.isFirstChange()) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.degreeDaysChart) {
      let traceData = [
        {
          x: this.yearSummaryData.map(data => { return Months[data.date.getMonth()].name }),
          y: this.yearSummaryData.map(data => { return data.heatingDegreeDays }),
          type: 'bar',
          name: 'Heating Degree Days',
          marker: {
            color: '#C0392B'
          }
        },
        {
          x: this.yearSummaryData.map(data => { return Months[data.date.getMonth()].name }),
          y: this.yearSummaryData.map(data => { return data.coolingDegreeDays }),
          type: 'bar',
          name: 'Cooling Degree Days',
          marker: {
            color: '#2980B9'
          }
        },
      ];

      var layout = {
        legend: {
          orientation: "h"
        },
        barmode: 'group',
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
