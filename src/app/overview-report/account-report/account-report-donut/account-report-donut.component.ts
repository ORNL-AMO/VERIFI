import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-report-donut',
  templateUrl: './account-report-donut.component.html',
  styleUrls: ['./account-report-donut.component.css']
})
export class AccountReportDonutComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  accountFacilitiesSummary: AccountFacilitiesSummary;


  @ViewChild('utilityCostDonut', { static: false }) utilityCostDonut: ElementRef;
  @ViewChild('utilityUsageDonut', { static: false }) utilityUsageDonut: ElementRef;
  @ViewChild('utilityEmissionsDonut', { static: false }) utilityEmissionsDonut: ElementRef;

  lastMonthsDate: string;
  yearPriorDate: string;
  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.drawCharts();
  }

  ngAfterViewInit() {
    this.drawCharts();
  }

  drawCharts() {
    let date1: Date = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    let date1Month: string = date1.toLocaleDateString("en-US", { month: 'short' });
    let date1Year: string = date1.toLocaleDateString("en-US", { year: "numeric" })
    this.lastMonthsDate = date1Month + ', ' + date1Year;
    let date2: Date = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    let date2Month: string = date2.toLocaleDateString("en-US", { month: 'short' });
    let date2Year: string = date2.toLocaleDateString("en-US", { year: "numeric" })
    this.yearPriorDate = date2Month + ', ' + date2Year;
    this.drawCostChart();
    this.drawEnergyUsageChart();
    this.drawEmissionsChart();
  }

  drawCostChart() {
    if (this.utilityCostDonut) {
      var data = [{
        values: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.energyCost }),
        labels: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        // textposition: ''
        // hoverinfo: 'label+value',
        hovertemplate: '%{label}: %{value:$,.0f} <extra></extra>',
        hole: .6,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        annotations: [{
          x: 0,
          y: 0,
          xref: 'x',
          yref: 'y',
          text: '<b>Costs <br>(' + this.yearPriorDate + ' - ' + this.lastMonthsDate + ')</b>',
          showarrow: false,
          font: {
            size: 24
          }
        }],
        xaxis: {
          visible: false
        },
        yaxis: {
          visible: false
        },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true,
      }
      this.plotlyService.newPlot(this.utilityCostDonut.nativeElement, data, layout, config);
    }
  }

  drawEnergyUsageChart() {
    if (this.utilityUsageDonut) {
      var data = [{
        values: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.energyUsage }),
        labels: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        // textposition: ''
        // hoverinfo: 'label+value',
        hovertemplate: '%{label}: %{value:,.0f} ' + this.account.energyUnit + ' <extra></extra>',
        hole: .6,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        annotations: [{
          x: 0,
          y: 0,
          xref: 'x',
          yref: 'y',
          text: '<b>Energy Usage <br>(' + this.yearPriorDate + ' - ' + this.lastMonthsDate + ')</b>',
          showarrow: false,
          font: {
            size: 24
          }
        }],
        xaxis: {
          visible: false
        },
        yaxis: {
          visible: false
        },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.utilityUsageDonut.nativeElement, data, layout, config);
    }
  }

  drawEmissionsChart() {
    if (this.utilityEmissionsDonut) {
      var data = [{
        values: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.emissions / 1000 }),
        labels: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        // textposition: ''
        // hoverinfo: 'label+value',
        hovertemplate: '%{label}: %{value:,.0f} tonne CO<sub>2</sub> <extra></extra>',
        hole: .6,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        annotations: [{
          x: 0,
          y: 0,
          xref: 'x',
          yref: 'y',
          text: '<b>Emissions <br>(' + this.yearPriorDate + ' - ' + this.lastMonthsDate + ')</b>',
          showarrow: false,
          font: {
            size: 24
          }
        }],
        xaxis: {
          visible: false
        },
        yaxis: {
          visible: false
        },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.utilityEmissionsDonut.nativeElement, data, layout, config);
    }
  }

}
