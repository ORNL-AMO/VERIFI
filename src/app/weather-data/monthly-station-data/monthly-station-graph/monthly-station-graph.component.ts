import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { DetailDegreeDay, WeatherDataSelection } from 'src/app/models/degreeDays';
import { Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-monthly-station-graph',
  templateUrl: './monthly-station-graph.component.html',
  styleUrls: ['./monthly-station-graph.component.css']
})
export class MonthlyStationGraphComponent {
  @Input()
  detailedDegreeDays: Array<DetailDegreeDay>;
  @Input()
  selectedMonth: Date;
  @Input()
  heatingTemp: number;
  @Input()
  coolingTemp: number;
  @Input()
  weatherDataSelection: WeatherDataSelection;


  @ViewChild('degreeDaysChart', { static: false }) degreeDaysChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes.degreeDays && !changes.degreeDays.isFirstChange()) || (changes.weatherDataSelection && !changes.weatherDataSelection.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.degreeDaysChart) {
      let traceData = [];
      if (this.weatherDataSelection == 'degreeDays' || this.weatherDataSelection == 'HDD') {
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return data.heatingDegreeDay }),
          type: 'bar',
          name: 'Heating Degree Days',
          yaxis: 'y',
          marker: {
            color: '#C0392B'
          }
        });
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return this.heatingTemp }),
          type: 'scatter',
          name: 'Heating Base Temp',
          yaxis: 'y2',
          marker: {
            color: '#F39C12'
          }
        })
      }
      if (this.weatherDataSelection == 'degreeDays' || this.weatherDataSelection == 'CDD') {
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return data.coolingDegreeDay }),
          type: 'bar',
          name: 'Cooling Degree Days',
          yaxis: 'y',
          marker: {
            color: '#2980B9'
          }
        });
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return this.coolingTemp }),
          type: 'scatter',
          name: 'Cooling Base Temp',
          yaxis: 'y2',
        })
      }

      let startRange: Date = new Date(this.selectedMonth);
      startRange.setDate(1);
      let endRange: Date = new Date(startRange);
      endRange.setMonth(endRange.getMonth()+1);
      endRange.setDate(1);

      traceData.push({
        x: this.detailedDegreeDays.map(data => { return data.time }),
        y: this.detailedDegreeDays.map(data => { return data.dryBulbTemp }),
        type: 'scatter',
        name: 'Dry Bulb Temp Readings',
        yaxis: 'y2',
        mode: 'lines+markers',
        marker: {
          color: '#273746'
        }
      });

      var layout = {
        legend: {
          orientation: "h"
        },
        barmode: 'group',
        title: {
          text: 'Daily Degree Days <br>(' + Months[this.selectedMonth.getMonth()].name + ', ' + this.selectedMonth.getFullYear() + ')',
          font: {
            size: 18
          },
        },
        xaxis: {
          automargin: true,
          range: [startRange, endRange]
        },
        yaxis: {
          automargin: true,
        },
        yaxis2: {
          title: {
            text: 'Dry Bulb Temp'
          },
          automargin: true,
          overlaying: 'y',
          side: 'right',
          ticksuffix: ' &#8457;',
          // dtick: yAxis2Dtick,
          rangemode: 'tozero',
          tickmode: 'sync'
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
