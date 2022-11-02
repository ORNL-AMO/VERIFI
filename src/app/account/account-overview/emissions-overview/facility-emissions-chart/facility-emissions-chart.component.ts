import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-emissions-chart',
  templateUrl: './facility-emissions-chart.component.html',
  styleUrls: ['./facility-emissions-chart.component.css']
})
export class FacilityEmissionsChartComponent implements OnInit {
  @ViewChild('emissionsDonut', { static: false }) emissionsDonut: ElementRef;
  facilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    })

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
      this.facilitiesSummary = accountFacilitiesSummary;
      this.drawChart();
    });
  }

  ngOnDestroy(){
    this.accountFacilitiesSummarySub.unsubscribe();
  }

  ngAfterViewInit(){
    this.drawChart();
  }
  
  drawChart() {
    if (this.emissionsDonut && this.facilitiesSummary && this.emissionsDisplay) {
      let hovertemplate: string = '%{label}: %{value:,.0f} tonne CO<sub>2</sub> <extra></extra>'
      let values: Array<number>;
      if(this.emissionsDisplay == 'location'){
        values = this.facilitiesSummary.facilitySummaries.map(summary => { return summary.locationEmissions / 1000 });
      }else{
        values = this.facilitiesSummary.facilitySummaries.map(summary => { return summary.marketEmissions / 1000 });
      }
      
      var data = [{
        values: values,
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
      this.plotlyService.newPlot(this.emissionsDonut.nativeElement, data, layout, config);
    }
  }
}
