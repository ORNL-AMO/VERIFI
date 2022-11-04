import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { YearMonthData } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-monthly-costs-chart',
  templateUrl: './monthly-costs-chart.component.html',
  styleUrls: ['./monthly-costs-chart.component.css']
})
export class MonthlyCostsChartComponent implements OnInit {
  @ViewChild('monthlyCostsChart', { static: false }) monthlyCostsChart: ElementRef;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.yearMonthDataSub = this.accountOverviewService.costsYearMonthData.subscribe(val => {
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
    if (this.monthlyCostsChart && this.yearMonthData) {
      let traceData = Array();
      let yaxisTitle: string = "Utility Costs";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:$,.0f} <extra></extra>'

      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.year });
      years = _.uniq(years);
      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        for (let i = 0; i < this.yearMonthData.length; i++) {
          if (this.yearMonthData[i].yearMonth.year == year) {
            x.push(this.yearMonthData[i].yearMonth.month);
            y.push(this.yearMonthData[i].energyCost);
          }
        }
        let trace = {
          type: 'scatter',
          x: x,
          y: y,
          name: year,
          text: x.map(item => { return year }),
          hovertemplate: hovertemplate,
        }
        traceData.push(trace);

      })


      var layout = {
        title: {
          text: yaxisTitle,
          font: {
            size: 24
          },
        },
        xaxis: {
          autotick: false,
        },
        yaxis: {
          title: {
            tickprefix: tickprefix
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
      this.plotlyService.newPlot(this.monthlyCostsChart.nativeElement, traceData, layout, config);
    }
  }
}
