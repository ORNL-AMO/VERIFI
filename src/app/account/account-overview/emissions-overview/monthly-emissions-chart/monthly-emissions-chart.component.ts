import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { YearMonthData } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-monthly-emissions-chart',
  templateUrl: './monthly-emissions-chart.component.html',
  styleUrls: ['./monthly-emissions-chart.component.css']
})
export class MonthlyEmissionsChartComponent implements OnInit {

  @ViewChild('monthlyEmissionsChart', { static: false }) monthlyEmissionsChart: ElementRef;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    })
    this.yearMonthDataSub = this.accountOverviewService.energyYearMonthData.subscribe(val => {
      this.yearMonthData = val;
      this.drawChart();
    })
  }

  ngOnDestroy() {
    this.yearMonthDataSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyEmissionsChart && this.yearMonthData && this.emissionsDisplay) {
      let traceData = Array();

      let yaxisTitle: string = "Utility Emissions (kg CO<sub>2</sub>)";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:,.0f} kg CO<sub>2</sub> <extra></extra>'

      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.year });
      years = _.uniq(years);
      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        for (let i = 0; i < this.yearMonthData.length; i++) {
          if (this.yearMonthData[i].yearMonth.year == year) {
            x.push(this.yearMonthData[i].yearMonth.month);
            if(this.emissionsDisplay == 'location'){
              y.push(this.yearMonthData[i].locationEmissions);
            }else{
              y.push(this.yearMonthData[i].marketEmissions);
            }
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
          hovertemplate: hovertemplate,
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
      this.plotlyService.newPlot(this.monthlyEmissionsChart.nativeElement, traceData, layout, config);
    }
  }
}
