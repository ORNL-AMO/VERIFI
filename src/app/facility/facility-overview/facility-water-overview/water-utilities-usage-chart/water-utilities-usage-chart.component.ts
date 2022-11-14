import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { FacilityOverviewService } from '../../facility-overview.service';
import * as _ from 'lodash';
import { UtilityColors } from 'src/app/shared/utilityColors';

@Component({
  selector: 'app-water-utilities-usage-chart',
  templateUrl: './water-utilities-usage-chart.component.html',
  styleUrls: ['./water-utilities-usage-chart.component.css']
})
export class WaterUtilitiesUsageChartComponent implements OnInit {

  @ViewChild('waterBarChart', { static: false }) waterBarChart: ElementRef;

  monthlySourceDataSub: Subscription;
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.monthlySourceDataSub = this.facilityOverviewService.waterMonthlySourceData.subscribe(sourceData => {
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
    if (this.waterBarChart && this.monthlySourceData && this.monthlySourceData.length != 0) {
      let traceData = new Array();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let yaxisTitle: string = "Utility Usage (" + selectedFacility.volumeLiquidUnit + ")";

      let hoverformat: string = ",.2f";
      let tickprefix: string = "";

      this.monthlySourceData.forEach(dataItem => {
        let years: Array<number> = dataItem.data.map(d => { return d.fiscalYear });
        years = _.uniq(years)
        let consumption: Array<number> = new Array();
        years.forEach(year => {
          let totalConsumption: number = 0;
          dataItem.data.forEach(d => {
            if (d.fiscalYear == year) {
              totalConsumption += d.consumption;
            }
          });
          consumption.push(totalConsumption);
        });
        let trace = {
          x: years,
          y: consumption,
          name: dataItem.source,
          type: 'bar',
          marker: {
            color: UtilityColors[dataItem.source].color,
          }
        }
        traceData.push(trace);
      })
      let xAxisTitle: string = 'Year';
      if (selectedFacility.fiscalYear == 'nonCalendarYear') {
        xAxisTitle = 'Fiscal Year';
      }

      var layout = {
        barmode: 'group',
        xaxis: {
          title: {
            text:xAxisTitle
          }
        },
        yaxis: {
          title: {
            text: yaxisTitle,
            tickprefix: tickprefix
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

      this.plotlyService.newPlot(this.waterBarChart.nativeElement, traceData, layout, config);
    }
  }

}
