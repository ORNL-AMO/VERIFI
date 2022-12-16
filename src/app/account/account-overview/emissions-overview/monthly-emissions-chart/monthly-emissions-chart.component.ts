import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { YearMonthData } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';
import * as _ from 'lodash';
import { Month, Months } from 'src/app/shared/form-data/months';
import { IdbAccount } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

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
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

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

      let yaxisTitle: string = "Utility Emissions (kg CO<sub>2</sub>e)";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:,.0f} kg CO<sub>2</sub>e <extra></extra>'

      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
      years = _.uniq(years);
      let months: Array<Month> = Months.map(month => { return month });
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      if (selectedAccount.fiscalYear == 'nonCalendarYear') {
        let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == selectedAccount.fiscalYearMonth });
        let fromStartMonth: Array<Month> = months.splice(monthStartIndex);
        months = fromStartMonth.concat(months);
      }
      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        months.forEach(month => {
          let emissions: number;
          let ymData: YearMonthData = this.yearMonthData.find(ymData => { return ymData.yearMonth.fiscalYear == year && ymData.yearMonth.month === month.abbreviation });
          if (ymData) {
            if (this.emissionsDisplay == 'location') {
              emissions = ymData.locationEmissions;
            } else {
              emissions = ymData.marketEmissions;
            }
          }
          x.push(month.abbreviation);
          y.push(emissions)
        });

        let name: string = year.toString();
        if (selectedAccount.fiscalYear == 'nonCalendarYear') {
          name = 'FY - ' + year
        }
        let trace = {
          type: 'scatter',
          x: x,
          y: y,
          name: name,
          text: x.map(item => {
            if (selectedAccount.fiscalYear == 'nonCalendarYear') {
              return 'FY - ' + year
            } else {
              return year
            }
          }),
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
      this.plotlyService.newPlot(this.monthlyEmissionsChart.nativeElement, traceData, layout, config);
    }
  }
}
