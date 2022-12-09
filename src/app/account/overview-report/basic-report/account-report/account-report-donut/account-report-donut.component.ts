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
  @Input()
  graphType: 'cost' | 'marketEmissions' | 'usage' | 'locationEmissions';


  @ViewChild('utilityDonut', { static: false }) utilityDonut: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawUtilityDonut();
  }

  drawUtilityDonut() {
    if (this.utilityDonut) {
      var data = [{
        values: this.getValues(),
        labels: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: this.getHoverTemplate(),
        hole: .6,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
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
      this.plotlyService.newPlot(this.utilityDonut.nativeElement, data, layout, config);
    }
  }

  getValues(): Array<number> {
    if (this.graphType == 'cost') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.energyCost });
    } else if (this.graphType == 'usage') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.energyUsage });
    } else if (this.graphType == 'marketEmissions') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.marketEmissions / 1000 });
    } else if (this.graphType == 'locationEmissions') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.locationEmissions / 1000 });
    }
  }

  getHoverTemplate(): string {
    if (this.graphType == 'cost') {
      return '%{label}: %{value:$,.0f} <extra></extra>';
    } else if (this.graphType == 'usage') {
      return '%{label}: %{value:,.0f} ' + this.account.energyUnit + ' <extra></extra>';
    } else if (this.graphType == 'marketEmissions' || this.graphType == 'locationEmissions') {
      return '%{label}: %{value:,.0f} tonne CO<sub>2</sub>e <extra></extra>';
    }
  }

}
