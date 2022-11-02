import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { FacilityOverviewService } from '../../facility-overview.service';
import * as _ from 'lodash';
import { UtilityColors } from 'src/app/shared/utilityColors';

@Component({
  selector: 'app-emissions-utilities-chart',
  templateUrl: './emissions-utilities-chart.component.html',
  styleUrls: ['./emissions-utilities-chart.component.css']
})
export class EmissionsUtilitiesChartComponent implements OnInit {

  @ViewChild('emissionsBarChart', { static: false }) emissionsBarChart: ElementRef;

  monthlySourceDataSub: Subscription;
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });
    this.monthlySourceDataSub = this.facilityOverviewService.energyMonthlySourceData.subscribe(sourceData => {
      this.monthlySourceData = sourceData;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.monthlySourceDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }



  drawChart() {
    if (this.emissionsBarChart && this.monthlySourceData && this.monthlySourceData.length != 0) {
      let traceData = new Array();
      let yaxisTitle: string = "Utility Emissions (kg CO<sub>2</sub>)";

      let hoverformat: string = ",.2f";
      let tickprefix: string = "";

      this.monthlySourceData.forEach(dataItem => {
        let years: Array<number> = dataItem.data.map(d => { return d.year });
        years = _.uniq(years)
        let emissions: Array<number> = new Array();
        years.forEach(year => {
          let totalEmissions: number = 0;
          dataItem.data.forEach(d => {
            if (d.year == year) {
              if (this.emissionsDisplay == 'location') {
                totalEmissions += d.locationEmissions;

              } else {
                totalEmissions += d.marketEmissions;
              }
            }
          });
          emissions.push(totalEmissions);
        });
        let trace = {
          x: years,
          y: emissions,
          name: dataItem.source,
          type: 'bar',
          marker: {
            color: UtilityColors[dataItem.source].color,
          }
        }
        traceData.push(trace);
      })

      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Utility Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        xaxis: {
          // title: {
          //   text: xAxisTitle,
          //   font: {
          //     size: 18
          //   },
          // },
        },
        yaxis: {
          title: {
            text: yaxisTitle,
            tickprefix: tickprefix
            // font: {
            //   size: 18
            // },
          },
          hoverformat: hoverformat
        },
        margin: { r: 0, t: 50 }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.emissionsBarChart.nativeElement, traceData, layout, config);
    }
  }
}
