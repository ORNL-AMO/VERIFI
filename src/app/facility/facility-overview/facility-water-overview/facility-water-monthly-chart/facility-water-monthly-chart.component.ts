import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { YearMonthData } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { FacilityOverviewService } from '../../facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-facility-water-monthly-chart',
  templateUrl: './facility-water-monthly-chart.component.html',
  styleUrls: ['./facility-water-monthly-chart.component.css']
})
export class FacilityWaterMonthlyChartComponent implements OnInit {

  @ViewChild('monthlyWaterChart', { static: false }) monthlyWaterChart: ElementRef;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.yearMonthDataSub = this.facilityOverviewService.waterYearMonthData.subscribe(val => {
      this.yearMonthData = val;
      this.drawChart();
    })
  }

  ngOnDestroy() {
    this.yearMonthDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyWaterChart && this.yearMonthData) {
      let traceData = Array();

      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let yaxisTitle: string = "Water Consumption (" + selectedFacility.volumeLiquidUnit + ")";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:,.0f} ' + selectedFacility.volumeLiquidUnit + ' <extra></extra>'

      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.year });
      years = _.uniq(years);
      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        for (let i = 0; i < this.yearMonthData.length; i++) {
          if (this.yearMonthData[i].yearMonth.year == year) {
            x.push(this.yearMonthData[i].yearMonth.month);
            y.push(this.yearMonthData[i].consumption);
          }
        }
        let trace = {
          type: 'scatter',
          x: x,
          y: y,
          name: year,
          text: x.map(item => { return year }),
          // marker: {
          //   color: facilityUsage.facility.color,
          // },
          hovertemplate: hovertemplate
        }
        traceData.push(trace);

      })


      var layout = {
        // barmode: 'group',
        title: {
          text: yaxisTitle,
          font: {
            size: 24
          },
        },
        xaxis: {
          autotick: false,
          // title: {
          //   text: 'Year',
          //   font: {
          //     size: 18
          //   },
          // },
          // range: xrange
        },
        yaxis: {
          title: {
            // text: yaxisTitle,
            tickprefix: tickprefix
            //   font: {
            //     size: 18
            //   },
          },
          hoverformat: hoverformat
        },
        legend: {
          orientation: 'h'
        }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.monthlyWaterChart.nativeElement, traceData, layout, config);
    }
  }
}
