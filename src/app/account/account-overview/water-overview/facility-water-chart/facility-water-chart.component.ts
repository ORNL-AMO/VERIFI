import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-facility-water-chart',
  templateUrl: './facility-water-chart.component.html',
  styleUrls: ['./facility-water-chart.component.css']
})
export class FacilityWaterChartComponent implements OnInit {
  @ViewChild('waterDonut', { static: false }) waterDonut: ElementRef;
  facilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(accountFacilitiesSummary => {
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
    if (this.waterDonut && this.facilitiesSummary) {
      
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let hovertemplate: string = '%{label}: %{value:,.0f} ' + selectedAccount.volumeLiquidUnit + ' <extra></extra>'
      var data = [{
        values: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.consumption }),
        labels: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
          line: {
            color: '#fff',
            width: 5
          }
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: hovertemplate,
        hole: .6,
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
      this.plotlyService.newPlot(this.waterDonut.nativeElement, data, layout, config);
    }
  }
}
