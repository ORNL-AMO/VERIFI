import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { DetailDegreeDay, WeatherDataSelection } from 'src/app/models/degreeDays';
import { Months } from 'src/app/shared/form-data/months';
import * as _ from 'lodash';

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
    if ((changes.degreeDays && !changes.degreeDays.isFirstChange()) || (changes.weatherDataSelection && !changes.weatherDataSelection.isFirstChange()) ||
      (changes.selectedMonth && !changes.selectedMonth.isFirstChange())) {
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
      endRange.setMonth(endRange.getMonth() + 1);
      endRange.setDate(1);


      let graphTitle: string;
      let yAxis2 = {
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
      };
      let yAxis = {
        title: {
          text: undefined
        },
        automargin: true,
        overlaying: undefined,
        side: 'left',
        ticksuffix: undefined,
        // dtick: yAxis2Dtick,
        rangemode: undefined,
        tickmode: undefined
      };

      if (this.weatherDataSelection != 'relativeHumidity') {
        graphTitle = 'Daily Degree Days <br>(' + Months[this.selectedMonth.getMonth()].name + ', ' + this.selectedMonth.getFullYear() + ')'
        let correspondingYaxis = 'y2';
        if (this.weatherDataSelection == 'dryBulbTemp') {
          correspondingYaxis = 'y';
          yAxis = {
            title: {
              text: 'Dry Bulb Temp'
            },
            automargin: true,
            overlaying: undefined,
            side: 'left',
            ticksuffix: ' &#8457;',
            // dtick: yAxis2Dtick,
            rangemode: 'tozero',
            tickmode: 'sync'
          };
          yAxis2 = {
            title: {
              text: undefined
            },
            automargin: true,
            overlaying: undefined,
            side: 'right',
            ticksuffix: undefined,
            // dtick: yAxis2Dtick,
            rangemode: undefined,
            tickmode: undefined
          };

        }
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return data.dryBulbTemp }),
          type: 'scatter',
          name: 'Dry Bulb Temp Readings',
          yaxis: correspondingYaxis,
          mode: 'lines+markers',
          marker: {
            color: '#273746'
          }
        });
      }

      if (this.weatherDataSelection == 'dryBulbTemp') {
        graphTitle = 'Dry Bulb Temp. <br>(' + Months[this.selectedMonth.getMonth()].name + ', ' + this.selectedMonth.getFullYear() + ')'
        let totalMinutes: number = _.sumBy(this.detailedDegreeDays, 'minutesBetween');
        let totalWeightedVals: number = _.sumBy(this.detailedDegreeDays, 'weightedDryBulbTemp')
        let results = totalWeightedVals / totalMinutes;
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return results.toFixed(1) }),
          type: 'scatter',
          name: 'Dry Bulb Temp',
          // yaxis: 'y',
          marker: {
            color: '#a04000'
          }
        })
      }

      if (this.weatherDataSelection == 'relativeHumidity') {
        yAxis.title.text = 'Relative Humidity';
        yAxis.ticksuffix = '%';
        graphTitle = 'Relative Humidity <br>(' + Months[this.selectedMonth.getMonth()].name + ', ' + this.selectedMonth.getFullYear() + ')'
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return data.relativeHumidity }),
          type: 'scatter',
          name: 'Relative Humidity',
          mode: 'lines+markers',
          yaxis: 'y',
          marker: {
            color: '#6c3483'
          }
        });


        let totalMinutes: number = _.sumBy(this.detailedDegreeDays, 'minutesBetween');
        let totalWeightedVals: number = _.sumBy(this.detailedDegreeDays, 'weightedRelativeHumidity')
        let results = totalWeightedVals / totalMinutes;
        traceData.push({
          x: this.detailedDegreeDays.map(data => { return data.time }),
          y: this.detailedDegreeDays.map(data => { return results.toFixed(1) }),
          type: 'scatter',
          name: 'Month Relative Humidity',
          yaxis: 'y',
        })
      }




      var layout = {
        legend: {
          orientation: "h"
        },
        barmode: 'group',
        title: {
          text: graphTitle,
          font: {
            size: 18
          },
        },
        xaxis: {
          automargin: true,
          range: [startRange, endRange]
        },
        yaxis: yAxis,
        yaxis2: yAxis2,
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
