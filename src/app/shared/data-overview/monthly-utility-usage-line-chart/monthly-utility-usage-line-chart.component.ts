import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/data-evaluation/account/account-overview/account-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { YearMonthData } from 'src/app/models/dashboard';
import { Month, Months } from '../../form-data/months';
import * as _ from 'lodash';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-monthly-utility-usage-line-chart',
    templateUrl: './monthly-utility-usage-line-chart.component.html',
    styleUrls: ['./monthly-utility-usage-line-chart.component.css'],
    standalone: false
})
export class MonthlyUtilityUsageLineChartComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  yearMonthData: Array<YearMonthData>;

  @ViewChild('monthlyUsageChart', { static: false }) monthlyUsageChart: ElementRef;

  emissionsDisplaySub: Subscription;
  emissionsDisplay: "market" | "location";
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    if (!this.facilityId) {
      //ACCOUNT
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
    } else {
      //FACILITY
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart()
      });
    }
  }

  ngOnDestroy() {
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }


  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.yearMonthData && !changes.yearMonthData.isFirstChange())) {
      this.drawChart();
    }
  }


  drawChart() {
    if (this.monthlyUsageChart && this.yearMonthData) {
      let traceData = Array();

      let accountOrFacility: IdbFacility | IdbAccount;
      if (!this.facilityId) {
        accountOrFacility = this.accountDbService.selectedAccount.getValue();
      } else {
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        accountOrFacility = facilities.find(facility => { return facility.guid == this.facilityId });
      }
      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
      years = _.uniq(years);
      years = _.orderBy(years, (year) => { return year }, 'asc');
      let months: Array<Month> = Months.map(month => { return month });
      if (accountOrFacility.fiscalYear == 'nonCalendarYear') {
        let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == accountOrFacility.fiscalYearMonth });
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
        if (accountOrFacility.fiscalYear == 'nonCalendarYear') {
          name = 'FY - ' + year
        }
        let trace = {
          type: 'scatter',
          x: x,
          y: y,
          name: name,
          text: x.map(item => {
            if (accountOrFacility.fiscalYear == 'nonCalendarYear') {
              return 'FY - ' + year
            } else {
              return year
            }
          }),
          hovertemplate: this.getHoverTemplate(accountOrFacility),
        }
        traceData.push(trace);

      })


      var layout = {
        title: {
          text: this.getYAxisTitle(accountOrFacility),
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
          return yearMonthData.totalWithLocationEmissions;
        } else {
          return yearMonthData.totalWithMarketEmissions;
        }
      } else if (this.dataType == 'water') {
        return yearMonthData.consumption;
      }
    }
    return;
  }


  getYAxisTitle(accountOrFacility: IdbAccount | IdbFacility): string {
    if (this.dataType == 'energyUse') {
      return "Utility Usage (" + accountOrFacility.energyUnit + ")";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    } else if (this.dataType == 'emissions') {
      return "Utility Emissions (tonne CO<sub>2</sub>e)";
    } else if (this.dataType == 'water') {
      return "Water Usage (" + accountOrFacility.volumeLiquidUnit + ")";
    }
  }

  getHoverTemplate(accountOrFacility: IdbAccount | IdbFacility): string {
    if (this.dataType == 'energyUse') {
      return '%{text} (%{x}): %{y:,.0f} ' + accountOrFacility.energyUnit + ' <extra></extra>';
    } else if (this.dataType == 'water') {
      return '%{text} (%{x}): %{y:,.0f} ' + accountOrFacility.volumeLiquidUnit + ' <extra></extra>';
    } else if (this.dataType == 'emissions') {
      return '%{text} (%{x}): %{y:,.0f} tonne CO<sub>2</sub>e <extra></extra>';
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
