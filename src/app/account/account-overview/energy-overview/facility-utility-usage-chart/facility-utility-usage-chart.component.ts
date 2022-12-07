import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-facility-utility-usage-chart',
  templateUrl: './facility-utility-usage-chart.component.html',
  styleUrls: ['./facility-utility-usage-chart.component.css']
})
export class FacilityUtilityUsageChartComponent implements OnInit {

  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  facilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
      this.facilitiesSummary = accountFacilitiesSummary;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyUseDonut && this.facilitiesSummary) {
      let selectedAccout: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let hovertemplate: string = '%{label}: %{value:,.0f} ' + selectedAccout.energyUnit + ' <extra></extra>'
      var data = [{
        values: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.energyUsage }),
        labels: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
          line: {
            color: '#fff',
            width: 5
          }
        },
        texttemplate: '%{label}: (%{percent:.1%})',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: hovertemplate,
        hole: .5,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.energyUseDonut.nativeElement, data, layout, config);
    }
  }
}
