import { Component, ElementRef, ViewChild, Input } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { YearMonthData } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';
import { Month, Months } from '../../form-data/months';
import * as _ from 'lodash';

@Component({
  selector: 'app-monthly-utility-usage-line-chart',
  templateUrl: './monthly-utility-usage-line-chart.component.html',
  styleUrls: ['./monthly-utility-usage-line-chart.component.css']
})
export class MonthlyUtilityUsageLineChartComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';

  @ViewChild('monthlyUsageChart', { static: false }) monthlyUsageChart: ElementRef;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;

  emissionsDisplaySub: Subscription;
  emissionsDisplay: "market" | "location";
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.yearMonthDataSub = this.accountOverviewService.energyYearMonthData.subscribe(val => {
      this.yearMonthData = val;
      this.drawChart();
    })

    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      this.yearMonthDataSub = this.accountOverviewService.energyYearMonthData.subscribe(accountFacilitiesSummary => {
        this.yearMonthData = accountFacilitiesSummary;
        if (this.dataType == 'energyUse') {
          this.drawChart();
        } else if (this.dataType == 'emissions' && this.emissionsDisplay) {
          this.drawChart();
        }
      });
    } else if (this.dataType == 'cost') {
      this.yearMonthDataSub = this.accountOverviewService.costsYearMonthData.subscribe(accountFacilitiesSummary => {
        this.yearMonthData = accountFacilitiesSummary;
        this.drawChart();
      });
    } else if (this.dataType == 'water') {
      this.yearMonthDataSub = this.accountOverviewService.waterYearMonthData.subscribe(accountFacilitiesSummary => {
        this.yearMonthData = accountFacilitiesSummary;
        this.drawChart();
      });
    }

    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        if (this.emissionsDisplay) {
          this.drawChart();
        }
      })
    }
  }

  ngOnDestroy() {
    this.yearMonthDataSub.unsubscribe();
    if(this.emissionsDisplaySub){
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyUsageChart && this.yearMonthData) {
      let traceData = Array();

      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
      years = _.uniq(years);
      let months: Array<Month> = Months.map(month => { return month });
      if (selectedAccount.fiscalYear == 'nonCalendarYear') {
        let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == selectedAccount.fiscalYearMonth });
        let fromStartMonth: Array<Month> = months.splice(monthStartIndex);
        months = fromStartMonth.concat(months);
      }
      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        months.forEach(month => {
          x.push(month.abbreviation);
          let yValue: number = this.getYValue(year, month);
          y.push(yValue);
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
          hovertemplate: this.getHoverTemplate(selectedAccount),
        }
        traceData.push(trace);

      })


      var layout = {
        title: {
          text: this.getYAxisTitle(selectedAccount),
          font: {
            size: 24
          },
        },
        xaxis: {
          autotick: false,
        },
        yaxis: {
          title: {
            tickprefix: this.getTickPrefix()
          },
          hoverformat: this.getHoverFormat()
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
      this.plotlyService.newPlot(this.monthlyUsageChart.nativeElement, traceData, layout, config);
    }
  }

  getYValue(year: number, month: Month): number {
    let yearMonthData: YearMonthData = this.yearMonthData.find(ymData => { return ymData.yearMonth.fiscalYear == year && ymData.yearMonth.month === month.abbreviation })
    if (yearMonthData) {
      if (this.dataType == 'energyUse') {
        return yearMonthData.energyUse;
      } else if (this.dataType == 'cost') {
        return yearMonthData.energyCost;
      } else if (this.dataType == 'emissions') {
        if (this.emissionsDisplay == 'location') {
          return yearMonthData.locationEmissions;
        } else {
          return yearMonthData.marketEmissions;
        }
      } else if (this.dataType == 'water') {
        return yearMonthData.consumption;
      }
    }
    return;
  }


  getYAxisTitle(selectedAccount: IdbAccount): string {
    if (this.dataType == 'energyUse') {
      return "Utility Usage (" + selectedAccount.energyUnit + ")";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    } else if (this.dataType == 'emissions') {
      return "Utility Emissions (kg CO<sub>2</sub>e)";
    } else if (this.dataType == 'water') {
      return "Water Usage (" + selectedAccount.volumeLiquidUnit + ")";
    }
  }

  getHoverTemplate(selectedAccount: IdbAccount): string {
    if (this.dataType == 'energyUse') {
      return '%{text} (%{x}): %{y:,.0f} ' + selectedAccount.energyUnit + ' <extra></extra>';
    } else if (this.dataType == 'water') {
      return '%{text} (%{x}): %{y:,.0f} ' + selectedAccount.volumeLiquidUnit + ' <extra></extra>';
    } else if (this.dataType == 'emissions') {
      return '%{text} (%{x}): %{y:,.0f} kg CO<sub>2</sub>e <extra></extra>';
    } else if (this.dataType == 'cost') {
      return '%{text} (%{x}): %{y:$,.0f} <extra></extra>';
    }
  }

  getHoverFormat(): string {

    return ",.2f";
  }

  getTickPrefix(): string {

    return "";
  }
}
