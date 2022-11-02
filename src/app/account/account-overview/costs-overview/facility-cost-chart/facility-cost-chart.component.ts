import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-cost-chart',
  templateUrl: './facility-cost-chart.component.html',
  styleUrls: ['./facility-cost-chart.component.css']
})
export class FacilityCostChartComponent implements OnInit {
  @ViewChild('costDonut', { static: false }) costDonut: ElementRef;
  facilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesCostsSummary.subscribe(accountFacilitiesSummary => {
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
    if (this.costDonut && this.facilitiesSummary) {
      let hovertemplate: string = '%{label}: %{value:$,.0f} <extra></extra>'
      var data = [{
        values: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.energyCost }),
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
      this.plotlyService.newPlot(this.costDonut.nativeElement, data, layout, config);
    }
  }
}
